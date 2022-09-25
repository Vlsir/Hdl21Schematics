import { orientation } from "./orientation";
import { Instance as InstanceData, Port as PortData } from "./schematicdata";
import { Point, point } from "./point";
import { PrimitiveKind } from "./primitive";
import { theCanvas } from "./canvas";
import { PortKind } from "./portsymbol";
import { Change, ChangeLog } from "./changes";

/// # Enumerated UI Modes
///
export enum UiModes {
  Idle = "Idle",
  AddInstance = "AddInstance",
  AddPort = "AddPort",
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
  changeLog: ChangeLog = new ChangeLog();

  // The last instance added. Serves as the default when adding new ones.
  // This initial value is never drawn; it just serves as the initial default instance.
  lastInstanceData: InstanceData = {
    name: "",
    of: "",
    kind: PrimitiveKind.Nmos,
    loc: point(0, 0),
    orientation: orientation.default(),
  };
  // The last port added
  lastPortData: PortData = {
    name: "",
    kind: PortKind.Input,
    loc: point(0, 0),
    orientation: orientation.default(),
  };

  // The currently selected entity (instance, wire, port, etc.)
  selected_entity: any = null; // FIXME: type
  // The currently pending entity, if there is one
  pending_entity: any = null; // FIXME: type
  // The currently pending change, if there is one
  pendingChange: Change | null = null;

  // Track the mouse position at all times.
  // Initializes to the center of the canvas.
  mouse_pos: Point = point(theCanvas.two.width / 2, theCanvas.two.height / 2);
  // Initialize the "starting" mouse position for pans
  start_mouse_pos: Point = structuredClone(this.mouse_pos);
}
