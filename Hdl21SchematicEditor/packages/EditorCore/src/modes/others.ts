/*
 * # UI Mode Handlers
 * All the "others" that haven't been filed into modules.
 */

import { EntityKind, Label } from "../drawing";
import { Instance, SchPort, Wire } from "../drawing";
import { nearestOnGrid, nearestManhattan } from "../drawing/grid";
import { Direction } from "../direction";
import { Keys } from "../keys";
import { Place } from "../place";
import { ChangeKind } from "../changes";
import { Primitive, PrimitiveKind, primitiveLib } from "../primitive";
import { PortKind, portLib, PortSymbol } from "../portsymbol";
import { SchEditor } from "../editor";
import { exhaust } from "../errors";
import { ControlPanelItem, updatePanels } from "../panels";

import { UiModes, UiModeHandlerBase } from "./base";

// # Before Startup
//
// A dummy handler which does nothing, but allows us to defer our construction-time
// dependencies between the mode handler, editor, and UI state until start-time,
// when all three are fully formed.
//
export class BeforeStartup extends UiModeHandlerBase {
  mode: UiModes.BeforeStartup = UiModes.BeforeStartup;
  abort = () => {}; // Never called, but must be defined.
}

export class Pan extends UiModeHandlerBase {
  mode: UiModes.Pan = UiModes.Pan;
  static start(editor: SchEditor) {
    return new Pan(editor);
  }

  abort = () => {}; // FIXME!
}
