import { Point, point } from "./point";

// Enumerated Kinds of Schematic Entities
export enum EntityKind {
  Instance = "Instance",
  InstancePort = "InstancePort",
  SchPort = "SchPort",
  Label = "Label",
  Wire = "Wire",
  Dot = "Dot",
}

// # Schematic Entity
//
// All the methods for interacting with a schematic entity.
// "Implementers" include Symbols, Ports, and WireSegments.
//
export interface EntityInterface {
  readonly entityKind: EntityKind;

  // Create and add the drawn, graphical representation
  draw(): void;
  // Update styling to indicate highlighted-ness
  highlight(): void;
  // Update styling to indicate the lack of highlighted-ness
  unhighlight(): void;
  // Boolean indication of whether `point` is inside the instance.
  hitTest(point: Point): boolean;
  // Abort an in-progress instance.
  abort(): void;
}

// # Schematic Entity
//
// All the methods for interacting with a schematic entity.
// "Implementers" include Symbols, Ports, and WireSegments.
//
export class Entity {
  kind: EntityKind;
  obj: any; // FIXME!
  constructor(kind: EntityKind, obj: any) {
    this.kind = kind; // EntityKind
    this.obj = obj; // Inner object
  }
  // Create and add the drawn, graphical representation
  draw = () => {
    return this.obj.draw();
  };
  // Update styling to indicate highlighted-ness
  highlight = () => {
    return this.obj.highlight();
  };
  // Update styling to indicate the lack of highlighted-ness
  unhighlight = () => {
    return this.obj.unhighlight();
  };
  // Boolean indication of whether `point` is inside the instance.
  hitTest = (point: Point) => {
    return this.obj.hitTest(point);
  };
  // Abort an in-progress instance.
  abort = () => {
    return this.obj.abort();
  };
}
