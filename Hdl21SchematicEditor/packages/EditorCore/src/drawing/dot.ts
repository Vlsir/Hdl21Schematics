// 
// # Connection Dots 
// 

// NPM Imports 
import { Circle } from "two.js/src/shapes/circle";

// Local Imports
import { Point } from "SchematicsCore";
import { dotStyle } from "./style";
import { EntityKind } from "./entity";
import { Wire } from "./wire";
import { Instance, SchPort } from "./instance";
import { theEditor } from "../editor";
import { Canvas } from "./canvas";

// Interface for "Dot Parents",
// i.e. schematic entities which have dots as children.
export interface DotParent {
  removeDot(dot: Dot): void;
}

// # Connection `Dot`
//
// The `Dot` class just looks like a circle in our drawing.
// In our editor it essentially does "reference counting"
// among things it may be connecting: wires, instances, and ports.
//
// Dots keep a set of references to their parents, and their parents
// keep references to each Dot. When a parent moves or otherwise no longer
// "uses" the Dot, it removes the Dot from its set of children, and calls
// the associated `remove` method on the Dot.
//
// When a Dot detects that it is only "connecting" a single parent, it
// essentially "garbage collects" itself, removing itself, from
// the remaining parent and from the canvas.
// Note it *does not* remove itself from the `Schematic`.
//
export class Dot {
  constructor(readonly loc: Point, private drawing: Circle) {}

  entityKind: EntityKind.Dot = EntityKind.Dot;

  // Data structures of parent entities
  wires: Set<Wire> = new Set();
  instances: Set<Instance> = new Set();
  ports: Set<SchPort> = new Set();

  highlighted: boolean = false;
  canvas: Canvas = theEditor.canvas; // Reference to the drawing canvas. FIXME: the "the" part.

  static create(loc: Point): Dot {
    return new Dot(loc, this.createDrawing(loc));
  }
  static createDrawing(loc: Point): Circle {
    return new Circle(loc.x, loc.y);
  }

  draw = () => {
    this.drawing.remove();
    this.drawing = Dot.createDrawing(this.loc);
    this.canvas.dotLayer.add(this.drawing);
    dotStyle(this.drawing);
    if (this.highlighted) {
      this.highlight();
    }
  };

  // Update styling to indicate highlighted-ness
  highlight() {
    // FIXME: merge with styling
    // FIXME: keep `stroke` off for text
    // this.drawing.stroke = "red";
    this.drawing.fill = "red";
    this.highlighted = true;
  }
  // Update styling to indicate the lack of highlighted-ness
  unhighlight() {
    // FIXME: merge with styling
    // this.drawing.stroke = "black";
    this.drawing.fill = "black";
    this.highlighted = false;
  }

  // Do-nothing methods
  hitTest = (loc: Point): boolean => {
    return false;
  };
  abort = () => {};

  addInstance = (instance: Instance) => this.instances.add(instance);
  removeInstance = (instance: Instance) => this.instances.delete(instance);
  addPort = (port: SchPort) => this.ports.add(port);
  removePort = (port: SchPort) => this.ports.delete(port);
  addWire = (wire: Wire) => this.wires.add(wire);
  removeWire = (wire: Wire) => this.wires.delete(wire);

  // Check if we are connecting anything, and if not, remove ourselves.
  // Generally should be called after removing a parent.
  maybeRemove = () => {
    if (this.refCount() <= 1) {
      this.remove();
    }
  };
  // Remove this dot from its parents and the canvas.
  remove = () => {
    this.parents().forEach((parent) => parent.removeDot(this));
    this.drawing.remove();
  };
  // Combined array of parent entities
  parents = () => {
    return [...this.wires, ...this.instances, ...this.ports];
  };
  // Calculate our "reference count", i.e. the number of things attached to us.
  refCount = () => {
    return this.wires.size + this.instances.size + this.ports.size;
  };
}
