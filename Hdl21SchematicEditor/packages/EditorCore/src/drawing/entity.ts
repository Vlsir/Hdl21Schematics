/*
 * # Schematic Entity
 *
 * The interface to and union-type of all the things that can be drawn on a schematic.
 */

// Local Imports
import { MousePos } from "../mousepos";
import { Instance, SchPort, InstancePort } from "./instance";
import { Wire } from "./wire";
import { Label } from "./label";
import { Dot } from "./dot";

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
  entityKind: EntityKind;
  entityId: number | null;

  // Create and add the drawn, graphical representation
  draw(): void;
  // Update styling to indicate highlighted-ness
  highlight(): void;
  // Update styling to indicate the lack of highlighted-ness
  unhighlight(): void;
  // Boolean indication of whether `point` is inside the instance.
  hitTest(mousePos: MousePos): boolean;
  // Abort an in-progress instance.
  abort(): void;
}

// The union-type of `EntityInterface` implementers
// This is a tagged union on `entityKind`, which we often use to differentiate between them.
export type Entity = Instance | SchPort | InstancePort | Wire | Label | Dot;
