import { Point } from "./point";

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
export interface Entity {
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
