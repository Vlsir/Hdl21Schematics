// Local Imports
import { Entity, EntityKind } from "./entity";
import { Wire } from "./wire";
import { Instance, SchPort } from "./instance";
import { Dot } from "./dot";
import { Point, point } from "../point";
import { exhaust } from "../errors";
import { SchEditor } from "../editor";
import { ManhattanSegment, hitTestSegment } from "../manhattan";
import { OrientationMatrix, matrix } from "../matrix";
import * as schdata from "../schematicdata";

class DotMap {
  // x as the major/ outer key
  byx: Map<number, Map<number, Dot>> = new Map();
  // y as the major/ outer key
  byy: Map<number, Map<number, Dot>> = new Map();
  // Set of all Dots
  set: Set<Dot> = new Set();

  // Get the Dot at point `p`, if one exists.
  get(p: Point): Dot | undefined {
    const xset = this.byx.get(p.x);
    if (!xset) {
      return undefined;
    }
    return xset.get(p.y);
  }

  // Insert a Dot into the map
  insert(dot: Dot) {
    const p = dot.loc;

    // Insert into the {x:{y:Dot}} map
    let xset = this.byx.get(p.x);
    if (!xset) {
      xset = new Map();
      this.byx.set(p.x, xset);
    }
    xset.set(p.y, dot);

    // Insert into the {y:{x:Dot}} map
    let yset = this.byy.get(p.y);
    if (!yset) {
      yset = new Map();
      this.byy.set(p.y, yset);
    }
    yset.set(p.x, dot);

    // Insert into the set
    this.set.add(dot);
  }

  // Remove a `Dot` from the map
  remove(dot: Dot): void {
    // Remove the dot from the canvas and its parents
    dot.remove();
    // Remove it from our set
    this.set.delete(dot);
    const xmap = this.byx.get(dot.loc.x);
    if (!xmap) {
      return;
    }
    xmap.delete(dot.loc.y);
  }

  // Convert to an (unordered) array of Dots
  toDotList(): Array<Dot> {
    let arr: Array<Dot> = [];
    for (const xmap of this.byx.values()) {
      for (const dot of xmap.values()) {
        arr.push(dot);
      }
    }
    return arr;
  }
  // Convert to an array of Dots
  // Sorted first by x, then by y
  toOrderedDotList(): Array<Dot> {
    let arr: Array<Dot> = [];
    const xorder = Array.from(this.byx.keys()).sort((a, b) => a - b);
    for (let x of xorder) {
      const xmap = this.byx.get(x)!;
      const yorder = Array.from(xmap.keys()).sort((a, b) => a - b);
      arr.push(...yorder.map((y) => xmap.get(y)!));
    }
    return arr;
  }
  // Convert to an array of Points
  // Sorted first by x, then by y
  toPoints(): Array<Point> {
    return [...this.toOrderedDotList()].map((dot) => dot.loc);
  }

  // Get the Dot at `loc`, or create and insert a new one if none exists.
  at(loc: Point): Dot {
    let dot = this.get(loc);
    if (!dot) {
      dot = Dot.create(loc);
      this.insert(dot);
    }
    return dot;
  }
}

// Infer Dot locations from schematic
//
// Candidates for dot locations include:
// * Each port of each instance
// * The origin of each (schematic) port
// * Each vertex of each wire
//
// A dot is inferred if these locations intersect a wire.
// One exception: the start/end of a wire coincident with the start/end of another wire
// *does not* generate a dot; these instead look like a larger "continued" wire.
//
// Wires do not test for "self-dots", i.e. vertices that land on their own segments.
function inferDots(sch: Schematic): DotMap {
  let dotMap = new DotMap();

  // First calculate the segments for each wire
  const myWires: Array<Wire> = Array.from(sch.wires.values());
  // FIXME: should zero-length wires be allowed? Perhaps with two instances ports at the same location.

  // Now for a mouthful!
  // Find every place that a point in a wire intersects another wire.
  for (let myWire of myWires) {
    for (let otherWire of myWires.filter((w) => w !== myWire)) {
      for (let myPoint of myWire.points) {
        if (
          // The "don't connect beginning/end of wires" rule
          !point.eq(myPoint, otherWire.points[0]) &&
          !point.eq(
            myPoint,
            otherWire.points[otherWire.points.length - 1]
          ) &&
          wireIntersectsPoint(otherWire, myPoint)
        ) {
          // Add a dot here, or add these wires to any existing dot at `myPoint`.
          const myDot = dotMap.at(myPoint);
          myDot.wires.add(myWire).add(otherWire);
        }
      }
    }
  }

  // And another one!
  // Check every schematic port
  for (let drawingPort of sch.ports.values()) {
    const portData = drawingPort.data;
    for (let myWire of myWires) {
      if (wireIntersectsPoint(myWire, portData.loc)) {
        const myDot = dotMap.at(portData.loc);
        myDot.ports.add(drawingPort);
        myDot.wires.add(myWire);
      }
    }
  }

  // And yet another!
  // Check every instance port
  for (let drawing_instance of sch.instances.values()) {
    const instData = drawing_instance.data;
    const mat = matrix.fromOrientation(instData.orientation);
    for (let elementPort of instData.element.ports) {
      const instance_port_loc = transform(elementPort.loc, mat, instData.loc);
      for (let myWire of myWires) {
        if (wireIntersectsPoint(myWire, instance_port_loc)) {
          const myDot = dotMap.at(instance_port_loc);
          myDot.instances.add(drawing_instance);
          myDot.wires.add(myWire);
        }
      }
    }
  }
  // And return our resulting DotMap
  return dotMap;
}

// Apply the `OrientationMatrix` transformation to `pt`.
// Computes `pt * mat + loc`.
function transform(pt: Point, mat: OrientationMatrix, loc: Point): Point {
  return point.new(
    mat.a * pt.x + mat.c * pt.y + loc.x,
    mat.b * pt.x + mat.d * pt.y + loc.y
  );
}

function wireIntersectsPoint(convWire: Wire, pt: Point): boolean {
  convWire.updateSegments();
  return !!convWire.segments!.some((seg) => hitTestSegmentConnects(seg, pt));
}

// Wrapper for hit-testing the wire segments for connectivity
const hitTestSegmentConnects = (seg: ManhattanSegment, pt: Point): boolean => {
  // Hit test the segment with *zero* tolerance, i.e. points must land exactly on it.
  return hitTestSegment(seg, pt, 0);
};

export class Schematic {
  constructor(
    public editor: SchEditor, // Reference to the parent Editor
    public size: Point = point.new(1600, 800), // Size/ outline
    public prelude: string = "", // Code prelude string
    public otherSvgElements: Array<string> = [] // List of other SVG elements, stored as strings. FIXME: kinda?
  ) {}

  // Internal data stores
  wires: Set<Wire> = new Set();
  instances: Set<Instance> = new Set();
  ports: Set<SchPort> = new Set();
  dotMap: DotMap = new DotMap();

  // FIXME: whether to keep the "all entities" set.
  // Thus far, it hasn't been needed.
  entities: Set<Entity> = new Set();

  // Running count of added instances, for naming.
  num_instances: number = 0;

  // Create a (drawn) `Schematic` from the abstract data model
  static fromData(editor: SchEditor, schData: schdata.Schematic): Schematic {
    const sch = new Schematic(
      editor,
      schData.size,
      schData.prelude,
      [] // FIXME! otherSvgElements
    );

    // Add all instances
    for (let instData of schData.instances) {
      sch.addInstance(Instance.create(instData));
    }
    // Add all ports
    for (let portData of schData.ports) {
      sch.addPort(SchPort.create(portData));
    }
    // Add all wires. Note we strip the sole `points` field out of these.
    for (let wireData of schData.wires) {
      const wire = Wire.create(wireData.points);
      wire.updateSegments();
      sch.addWire(wire);
    }

    // Run dot-inference, and compare the dot locations to those stored in the schematic.
    // Neither have any semantic meaning, but are important visual aids.
    // Not matching means... we're not sure what. Probably a version mismatch between writer and reader?
    // FIXME! move this somewhere more helpful

    sch.dotMap = inferDots(sch);

    const inferredDotLocs = sch.dotMap.toPoints();
    const sortedDotLocs = schData.dots.sort(pointOrder);
    if (!pointListEq(inferredDotLocs, sortedDotLocs)) {
      console.warn("Inferred dots do not match sorted dots!");
      console.log("Inferred:");
      console.log(inferredDotLocs);
      console.log("From Schematic:");
      console.log(sortedDotLocs);
    } else {
      console.log("Dot Inference vs Schematic ('DIVS' (tm)) Checked Out!");
    }
    // And return the new schematic
    return sch;
  }
  // Export to the abstract data model
  toData = (): schdata.Schematic => {
    const schData = new schdata.Schematic();
    schData.name = ""; // FIXME
    schData.size = structuredClone(this.size);
    schData.prelude = structuredClone(this.prelude);
    schData.otherSvgElements = []; // FIXME!

    // Save all of our primary data structures `data` elements
    this.instances.forEach((inst) => schData.instances.push(inst.data));
    this.ports.forEach((port) => schData.ports.push(port.data));
    this.wires.forEach((wire) => schData.wires.push({ points: wire.points }));
    this.dots.forEach((dot) => schData.dots.push(dot.loc));
    return schData;
  };
  // Draw all elements in the schematic.
  draw = () => {
    this.instances.forEach((e) => e.draw());
    this.ports.forEach((e) => e.draw());
    this.wires.forEach((e) => e.draw());
    this.dots.forEach((e) => e.draw());
  };
  // Add an entity to the schematic. Largely dispatches according to the entity's kind.
  addEntity = (entity: Entity): void => {
    const { entityKind } = entity;
    switch (entityKind) {
      // Delete-able entities
      case EntityKind.SchPort:
        return this.addPort(entity);
      case EntityKind.Dot:
        return this.addDot(entity);
      case EntityKind.Wire:
        return this.addWire(entity);
      case EntityKind.Instance:
        return this.addInstance(entity);
      // Non directly add-able "child" entities
      case EntityKind.Label:
      case EntityKind.InstancePort:
        return;
      default:
        throw exhaust(entityKind); // Exhaustiveness check
    }
  };
  // Remove an entity from the schematic. Largely dispatches according to the entity's kind.
  removeEntity = (entity: Entity) => {
    const { entityKind } = entity;
    switch (entityKind) {
      // Delete-able entities
      case EntityKind.SchPort:
        return this.removePort(entity);
      case EntityKind.Dot:
        return this.removeDot(entity);
      case EntityKind.Wire:
        return this.removeWire(entity);
      case EntityKind.Instance:
        return this.removeInstance(entity);
      // Non-delete-able "child" entities
      case EntityKind.Label:
      case EntityKind.InstancePort:
        return;
      default:
        throw exhaust(entityKind); // Exhaustiveness check
    }
  };
  // Add a port to the schematic.
  addPort = (port: SchPort): void => {
    // Add to our internal structures
    this.entities.add(port);
    this.ports.add(port);
    // FIXME: need to also add Entities per Port and Label
  };
  removePort = (port: SchPort) => {
    this.ports.delete(port);
    this.entities.delete(port);
    // FIXME: delete its port and label entities too
    // Remove the port's drawing
    port.removeDrawing();
  };
  // Add a wire to the schematic. Returns its ID if successful, or `null` if not.
  addWire = (wire: Wire) => {
    this.wires.add(wire);
    this.entities.add(wire);
  };
  // Remove a wire from the schematic.
  removeWire = (wire: Wire) => {
    this.wires.delete(wire);
    this.entities.delete(wire);

    // Remove the wire's drawing
    if (wire.drawing) {
      wire.drawing?.remove();
    }
  };
  // Add an instance to the schematic.
  addInstance = (instance: Instance): void => {
    this.entities.add(instance);
    this.instances.add(instance);
    this.num_instances += 1;
    // FIXME: need to also add Entities per Port and Label
  };
  removeInstance = (instance: Instance): void => {
    // Remove from our internal structures
    this.instances.delete(instance);
    this.entities.delete(instance);
    // Remove the instance's drawing
    instance.removeDrawing();
  };

  addDot = (dot: Dot) => this.dotMap.insert(dot);
  removeDot = (dot: Dot): void => this.dotMap.remove(dot);
  // Remove and re-infer all `Dot`s in the schematic.
  // FIXME! we never *really* want to do this, it should be done incrementally. But it's a (slow) start.
  // This is called at commit-time of each `Move`, `Add`, and `Delete` action.
  updateDots = () => {
    this.dots.forEach((e) => this.removeDot(e));
    this.dotMap = inferDots(this);
    this.dots.forEach((e) => e.draw());
  };
  // Get all of our Dots as an array.
  get dots(): Array<Dot> {
    return this.dotMap.toDotList();
  }
}

// Ordering comparator for `Point`s, particularly when sorting lists of them.
// Sorts by `x` first, then `y`.
function pointOrder(a: Point, b: Point): number {
  if (a.x < b.x) {
    return -1;
  }
  if (a.x > b.x) {
    return 1;
  }
  if (a.y < b.y) {
    return -1;
  }
  if (a.y > b.y) {
    return 1;
  }
  return 0;
}

// Compare two lists of `Point`s
function pointListEq(a: Array<Point>, b: Array<Point>): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) {
      return false;
    }
  }
  return true;
}
