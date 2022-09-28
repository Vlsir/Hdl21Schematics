import { Circle } from "two.js/src/shapes/circle";

// Local Imports
import { Point, point } from "./point";
import * as schdata from "./schematicdata";
import { EntityInterface, Entity, EntityKind } from "./entity";
import { Wire } from "./wire";
import { Instance, SchPort, InstancePort } from "./instance";
import { exhaust } from "./errors";

// # Connection Dot 
// 
// The `Dot` class just looks like a circle in our drawing. 
// But it's got among the most fun behavior. 
// Each `Dot` has one or more `Wire`s and zero or one `Instance`s attached to it. 
// The `update` methods check if the total number of these things has 
// decreased to less than or equal to *one*, 
// and if so, the dot is removed. 
// 
export class Dot {
  constructor(readonly loc: Point, public drawing: Circle) {}

  entityId: number | null = null;
  wires: Array<Wire> = [];
  instance: Instance | null = null;
  highlighted: boolean = false;

  static create(loc: Point): Dot {
    return new Dot(loc, this.createDrawing(loc));
  }
  static createDrawing(loc: Point): Circle {
    return new Circle(loc.x, loc.y, 4);
  }

  draw = () => {
    this.drawing.remove();
    this.drawing = Dot.createDrawing(this.loc);
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

  updateInstance = (instance: Instance | null) => {

  }

}
