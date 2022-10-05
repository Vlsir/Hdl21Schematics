/*
 * # UI Mode Handler
 * Enumerated Values & Base Class
 */

import { SchEditor } from "../editor";

// # Enumerated UI Modes
export enum UiModes {
  BeforeStartup = "BeforeStartup",
  Idle = "Idle",
  AddInstance = "AddInstance",
  AddPort = "AddPort",
  MoveInstance = "MoveInstance",
  EditLabel = "EditLabel",
  DrawWire = "DrawWire",
  Pan = "Pan",
}

// # Handler Base Class
export abstract class UiModeHandlerBase {
  // Value from the `UiModes` enum. Must be distinct for each subclass.
  abstract mode: UiModes;

  // Sub-class constructors often take additional data, e.g. an active/ pending entity.
  // All include the parent `SchEditor`.
  constructor(public editor: SchEditor) {}

  // Abort the in-progress operation and return to the `Idle` mode.
  // The result of calling `abort` should be that the UI looks identical
  // to its state as of the moment before the mode was entered.
  abstract abort(): void;

  // Event handlers, forwarded from the `SchEditor`.
  // Note:
  // (a) These are default-implemented to do nothing. Sub-classes override as needed.
  // (b) The mouse events are not passed the `MouseEvent` object,
  //     but are to use the editor's current mouse position.
  //
  handleKey = (e: KeyboardEvent) => {};
  handleMouseDown = () => {};
  handleMouseUp = () => {};
  handleDoubleClick = () => {};
  handleMouseMove = () => {};
}
