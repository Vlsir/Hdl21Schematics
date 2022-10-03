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
  abstract mode: UiModes;
  constructor(public editor: SchEditor) {}
  handleKey = (e: KeyboardEvent) => {};
  handleMouseDown = () => {};
  handleMouseUp = () => {};
  handleDoubleClick = () => {};
  handleMouseMove = () => {};
}
