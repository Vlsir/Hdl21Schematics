/*
 * # UI Mode Handlers
 */

// Import all the mode handler implementations.
import { Idle } from "./idle";
import { AddPort, AddInstance } from "./add";
import { MoveInstance } from "./move";
import { DrawWire } from "./draw_wire";
import { EditLabel } from "./edit_label";
import { BeforeStartup, EditPrelude, Pan } from "./others";

// The union-type of all the UiModeHandlers.
export type UiModeHandler =
  | BeforeStartup
  | Idle
  | AddInstance
  | AddPort
  | MoveInstance
  | EditLabel
  | EditPrelude
  | DrawWire
  | Pan;

// And an object "namespace" for access to them.
export const ModeHandlers = {
  BeforeStartup,
  Idle,
  AddInstance,
  AddPort,
  MoveInstance,
  EditLabel,
  EditPrelude,
  DrawWire,
  Pan,
};
