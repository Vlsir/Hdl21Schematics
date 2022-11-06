// Local Imports
import { Entity, EntityKind } from "./entity";
import { Wire } from "./wire";
import { Instance, SchPort } from "./instance";
import { Dot } from "./dot";
import { Point, pointNamespace } from "../point";
import * as schdata from "../schematicdata";
import { exhaust } from "../errors";
import { SchEditor } from "../editor";
import { calcSegments, ManhattanSegment, hitTestSegment } from "../manhattan";
import { OrientationMatrix, matrix } from "../orientation";

class DotMap {
  // x as the major/ outer key
  byx: Map<number, Map<number, DotSomething>> = new Map();
  // y as the major/ outer key
  byy: Map<number, Map<number, DotSomething>> = new Map();

  // Get the Dot at point `p`, if one exists.
  get(p: Point): DotSomething | undefined {
    const xset = this.byx.get(p.x);
    if (!xset) {
      return undefined;
    }
    return xset.get(p.y);
  }

  // Insert a Dot into the map
  insert(dot: DotSomething) {
    const p = dot.loc;
    let xset = this.byx.get(p.x);
    if (!xset) {
      xset = new Map();
      this.byx.set(p.x, xset);
    }
    xset.set(p.y, dot);

    let yset = this.byy.get(p.y);
    if (!yset) {
      yset = new Map();
      this.byy.set(p.y, yset);
    }
    yset.set(p.x, dot);
  }

  // Convert to an array of Dots
  // Sorted first by x, then by y
  toDotList(): Array<DotSomething> {
    let arr: Array<DotSomething> = [];
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
    return [...this.toDotList()].map((dot) => dot.loc);
  }

  // Get the Dot at `loc`, or create and insert a new one if none exists.
  at(loc: Point): DotSomething {
    let dot = this.get(loc);
    if (!dot) {
      dot = new DotSomething(loc);
      this.insert(dot);
    }
    return dot;
  }
}

class DotSomething {
  constructor(public loc: Point) {}
  wires: Set<WireAndSegments> = new Set();
  instances: Set<schdata.Instance> = new Set();
  schports: Set<schdata.Port> = new Set();
}

interface WireAndSegments {
  wire: schdata.Wire;
  segments: Array<ManhattanSegment>;
}

// Infer Dot locations from schematic data
//
// Candidates for dot locations include:
// * Each port of each instance
// * The origin of each (schematic) port
// * Each vertex of each wire
//
// A dot is inferred if these locations intersect a wire,
// but are not at that wire's start or end point.
//
// Wires do not test for "self-dots", i.e. vertices that land on their own segments.
function inferDots(schdata: schdata.Schematic): Array<Point> {
  let dotMap = new DotMap();

  // First calculate the segments for each wire
  const myWires: Array<WireAndSegments> = schdata.wires.map((wire) => ({
    wire,
    segments: calcSegments(wire.points)!, // FIXME: should zero-length wires be allowed? Perhaps with two instances ports at the same location.
  }));

  // Now for a mouthful!
  // Find every place that a point in a wire intersects another wire.
  for (let myWire of myWires) {
    for (let otherWire of myWires.filter((w) => w !== myWire)) {
      for (let myPoint of myWire.wire.points) {
        if (
          !pointNamespace.eq(myPoint, otherWire.wire.points[0]) &&
          !pointNamespace.eq(
            myPoint,
            otherWire.wire.points[otherWire.wire.points.length - 1]
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
  for (let schport of schdata.ports) {
    for (let myWire of myWires) {
      if (wireIntersectsPoint(myWire, schport.loc)) {
        const myDot = dotMap.at(schport.loc);
        myDot.schports.add(schport);
        myDot.wires.add(myWire);
      }
    }
  }
  for (let sch_instance of schdata.instances) {
    const mat = matrix.fromOrientation(sch_instance.orientation);
    for (let prim_port of sch_instance.primitive.ports) {
      const instance_port_loc = transform(prim_port.loc, mat, sch_instance.loc);
      for (let myWire of myWires) {
        if (wireIntersectsPoint(myWire, instance_port_loc)) {
          const myDot = dotMap.at(instance_port_loc);
          myDot.instances.add(sch_instance);
          myDot.wires.add(myWire);
        }
      }
    }
  }

  // Convert the DotMap to list/ array form for return
  return dotMap.toPoints();
}

// Apply the `OrientationMatrix` transformation to `pt`.
// Computes `pt * mat + loc`.
function transform(pt: Point, mat: OrientationMatrix, loc: Point): Point {
  return pointNamespace.new(
    mat.a * pt.x + mat.c * pt.y + loc.x,
    mat.b * pt.x + mat.d * pt.y + loc.y
  );
}

function wireIntersectsPoint(convWire: WireAndSegments, pt: Point): boolean {
  return !!convWire.segments.some((seg) => hitTestSegmentConnects(seg, pt));
}

// Wrapper for hit-testing the wire segments for connectivity
const hitTestSegmentConnects = (seg: ManhattanSegment, pt: Point): boolean => {
  // Hit test the segment with *zero* tolerance, i.e. points must land exactly on it.
  return hitTestSegment(seg, pt, 0);
};

export class Schematic {
  constructor(
    public editor: SchEditor, // Reference to the parent Editor
    public size: Point = pointNamespace.new(1600, 800), // Size/ outline
    public prelude: string = "", // Code prelude string
    public otherSvgElements: Array<string> = [] // List of other SVG elements, stored as strings. FIXME: kinda?
  ) {}

  // Internal data stores
  wires = new Map(); // Map<Number, Wire>
  instances = new Map(); // Map<Number, Instance>
  ports = new Map(); // Map<Number, SchPort>
  dots = new Map(); // Map<Number, Dot>
  entities = new Map(); // Map<Number, Entity>

  // Running count of added instances, for naming.
  num_instances = 0;
  num_ports = 0;
  // Running count of added schematic entities. Serves as their "primary key" in each Map.
  num_entities = 0;

  // Create a (drawn) `Schematic` from the abstract data model
  static fromData(editor: SchEditor, schData: schdata.Schematic): Schematic {
    // Run dot-inference, and compare the dot locations to those stored in the schematic.
    // Neither have any semantic meaning, but are important visual aids.
    // Not matching means... we're not sure what. Probably a version mismatch between writer and reader?
    // FIXME! move this somewhere more helpful
    const inferredDotLocs = inferDots(schData);
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
      sch.addWire(Wire.create(wireData.points));
    }
    // Add all dots
    for (let dotLoc of inferredDotLocs) {
      sch.addDot(Dot.create(dotLoc));
    }
    return sch;
  }
  // Export to the abstract data model
  toData = () => {
    /* Schematic => schdata.Schematic */
    const schData = new schdata.Schematic();
    schData.name = ""; // FIXME
    schData.size = structuredClone(this.size);
    schData.prelude = structuredClone(this.prelude);
    schData.otherSvgElements = []; // FIXME!
    for (let [id, inst] of this.instances) {
      schData.instances.push(inst.data);
    }
    for (let [id, port] of this.ports) {
      schData.ports.push(port.data);
    }
    for (let [id, wire] of this.wires) {
      schData.wires.push({ points: wire.points });
    }
    for (let [id, dot] of this.dots) {
      schData.dots.push(dot.loc);
    }
    return schData;
  };
  // Add an element to the `entities` mapping. Returns its ID if successful.
  _insertEntity = (entity: Entity) => {
    // Set the entity's ID, if it doesn't have one already.
    // We get re-inserted entities from the undo stack, so we need to check for this.
    if (!entity.entityId) {
      entity.entityId = this.num_entities;
      // Increment the number of entities even if we fail, hopefully breaking out of failure cases.
      this.num_entities += 1;
    }
    const { entityId } = entity;

    if (this.entities.has(entityId)) {
      console.log(`Entity ${entityId} already exists. Cannot add ${entity}.`);
      return null;
    }
    // Success, add it to the map and return the ID.
    this.entities.set(entityId, entity);
    return entityId;
  };
  // Add an entity to the schematic. Largely dispatches according to the entity's kind.
  addEntity = (entity: Entity): void => {
    /* Entity => void */
    // const entityId = this._insertEntity(entity);
    // if (entityId === null) { return; }

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
  addPort = (port: SchPort) => {
    /* Port => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(port);
    // Increment our port count, whether we succeeded or not.
    this.num_ports += 1;
    if (entityId !== null) {
      this.ports.set(entityId, port);
    }
    // FIXME: need to also add Entities per Port and Label
  };
  removePort = (port: SchPort) => {
    if (!this.ports.has(port.entityId)) {
      console.log("Port not found in schematic");
      return;
    }
    this.ports.delete(port.entityId);
    this.entities.delete(port.entityId);
    // FIXME: delete its port and label entities too

    // Remove the port's drawing
    port.removeDrawing();
  };
  // Add a wire to the schematic. Returns its ID if successful, or `null` if not.
  addWire = (wire: Wire) => {
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(wire);
    // And if successful, add it to our `wires` mapping.
    if (entityId !== null) {
      this.wires.set(entityId, wire);
    }
  };
  // Remove a wire from the schematic.
  removeWire = (wire: Wire) => {
    this.wires.delete(wire.entityId);
    this.entities.delete(wire.entityId);

    // Remove the wire's drawing
    if (wire.drawing) {
      wire.drawing?.remove();
    }
  };
  // Add an instance to the schematic.
  addInstance = (instance: Instance) => {
    /* Instance => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(instance);
    // Increment our instance count, whether we succeeded or not.
    this.num_instances += 1;
    if (entityId !== null) {
      this.instances.set(entityId, instance);
    }
    // FIXME: need to also add Entities per Port and Label
  };
  removeInstance = (instance: Instance) => {
    if (!this.instances.has(instance.entityId)) {
      console.log("Instance not found in schematic");
      return;
    }
    this.instances.delete(instance.entityId);
    this.entities.delete(instance.entityId);

    // Remove the instance's drawing
    instance.removeDrawing();
  };
  // Add an dot to the schematic.
  addDot = (dot: Dot) => {
    /* Dot => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(dot);
    if (entityId !== null) {
      this.dots.set(entityId, dot);
    }
  };
  removeDot = (dot: Dot) => {
    if (!this.dots.has(dot.entityId)) {
      console.log("Dot not found in schematic");
      return;
    }
    this.dots.delete(dot.entityId);
    this.entities.delete(dot.entityId);

    // Remove the dot's drawing
    if (dot.drawing) {
      dot.drawing?.remove();
    }
  };
  // Draw all elements in the schematic.
  draw = () => {
    for (let [key, instance] of this.instances) {
      instance.draw();
    }
    for (let [key, port] of this.ports) {
      port.draw();
    }
    for (let [key, wire] of this.wires) {
      wire.draw();
    }
    for (let [key, dot] of this.dots) {
      dot.draw();
    }
  };
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
