import {
  orientation,
  Instance as InstanceData,
  Port as PortData,
  point,
  ElementKind,
  elementLib,
  PortKind,
  portLib,
} from "SchematicsCore";

import { ChangeLog } from "./changes";
import { SchEditor } from "./editor";
import { UiModes, UiModeHandler, ModeHandlers } from "./modes";
import { Entity } from "./drawing";
import { MousePos, mousepos } from "./mousepos";
import { PanelProps, panelProps } from "./panels";

// # UI State
//
// Everything about the current state of the UI that *is not* the content of the schematic.
//
export class UiState {
  // Our sole contructor argument is the parent schematic editor
  constructor(public editor: SchEditor) {
    // Set the "null" before-startup mode, so we can defer some construction-time links.
    this.modeHandler = new ModeHandlers.BeforeStartup(editor);
  }

  // Mode-specific handler
  modeHandler: UiModeHandler;
  // Accessor for the enumerated `UiModes` value.
  get mode(): UiModes {
    return this.modeHandler.mode;
  }

  // Change-log, for undo-redo
  changeLog: ChangeLog = new ChangeLog();

  // The last instance added. Serves as the default when adding new ones.
  // This initial value is never drawn; it just serves as the initial default instance.
  lastInstanceData: InstanceData = {
    name: "",
    of: "",
    kind: ElementKind.Nmos,
    element: elementLib.default(),
    loc: point.new(0, 0),
    orientation: orientation.default(),
  };
  // The last port added
  lastPortData: PortData = {
    name: "",
    kind: PortKind.Input,
    portElement: portLib.default(),
    loc: point.new(0, 0),
    orientation: orientation.default(),
  };

  // The currently selected entity (instance, wire, port, etc.)
  selected_entity: Entity | null = null;

  // Track the mouse position at all times.
  // Initializes to the center of the canvas.
  mousePos: MousePos = mousepos.origin();

  // State of the peripheral panels
  panelProps: PanelProps = panelProps.default();
}
