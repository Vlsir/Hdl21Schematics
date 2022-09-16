import { Orientation, Instance as InstanceData } from "./schematic";
import { Point } from "./point";
import { PrimitiveKind } from "./primitive";
import { theCanvas } from "./canvas";

// Enumerate Update Types
// Stored in the playback queue, e.g. for undo/redo.
export enum UpdateTypes {
  AddInstance = "AddInstance",
  MoveInstance = "MoveInstance",
  RemoveInstance = "RemoveInstance",
  RemoveGroup = "RemoveGroup",
  AddWire = "AddWire",
  RemoveWire = "RemoveWire",
}

/// # Enumerated UI Modes
///
export enum UiModes {
  Idle = "Idle",
  AddInstance = "AddInstance",
  MoveInstance = "MoveInstance",
  EditLabel = "EditLabel",
  DrawWire = "DrawWire",
  Pan = "Pan",
}

// # UI State
//
// Everything about the current state of the UI that *is not* the content of the schematic.
//
export class UiState {
  // Global UI mode
  mode: UiModes = UiModes.Idle;
  // Change-log, for undo-redo
  changes: Array<UpdateTypes> = [];

  // The last instance added. Serves as the default when adding new ones.
  // This initial value is never drawn; it just serves as the initial default instance.
  lastInstanceData: InstanceData = {
    name: "",
    of: "",
    kind: PrimitiveKind.Nmos,
    loc: new Point(0, 0),
    orientation: Orientation.default(),
  };

  // The currently selected entity (instance, wire, port, etc.)
  selected_entity: any = null; // FIXME: type
  // Track the mouse position at all times.
  // Initializes to the center of the canvas.
  mouse_pos: Point = new Point(
    theCanvas.two.width / 2,
    theCanvas.two.height / 2
  );
  // Initialize the "starting" mouse position for pans
  start_mouse_pos: Point = this.mouse_pos.copy();
}
