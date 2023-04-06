/*
 * # Idle Mode Handler
 */

// Local Imports
import { Direction, exhaust } from "SchematicsCore";

import { EntityKind } from "../drawing";
import { Keys } from "../keys";
import { SchEditor } from "../editor";
import { ControlPanelItem } from "../panels";

import { UiModes, UiModeHandlerBase } from "./base";
import { AddPort, AddInstance } from "./add";
import { MoveInstance } from "./move";
import { EditLabel } from "./edit_label";
import { DrawWire } from "./draw_wire";

// # Idle Mode
//
// The typical state of sitting there, doing nothing.
// Primarily this state waits for actions to enter other modes.
// Clicking on entities selects them.
// Note having something `selected` is orthogonal to `Idle`;
// we can be in this state and have something selected.
//
export class Idle extends UiModeHandlerBase {
  mode: UiModes.Idle = UiModes.Idle;

  static start(editor: SchEditor) {
    const me = new Idle(editor);
    me.updatePanels();
    return me;
  }
  updatePanels = () => {
    const idlePanelItems: Array<ControlPanelItem> = [
      {
        text: "Add Instance",
        icon: null,
        shortcutKey: Keys.i,
        onClick: () => this.startAddInstance(),
      },
      {
        text: "Add Port",
        icon: null,
        shortcutKey: Keys.p,
        onClick: () => this.startAddPort(),
      },
      {
        text: "Add Wire",
        icon: null,
        shortcutKey: Keys.w,
        onClick: () => this.startDrawWire(),
      },
    ];
    const { panelProps } = this.editor.uiState;
    this.editor.updatePanels({
      ...panelProps,
      controlPanel: {
        items: idlePanelItems,
      },
    });
  };
  // Move to the `AddInstance` mode.
  startAddInstance = () => {
    const { editor } = this;
    editor.uiState.modeHandler = AddInstance.start(editor);
  };
  // Move to the `AddPort` mode.
  startAddPort = () => {
    const { editor } = this;
    editor.uiState.modeHandler = AddPort.start(editor);
  };
  // Move to the `DrawWire` mode.
  startDrawWire = () => {
    const { editor } = this;
    editor.uiState.modeHandler = DrawWire.start(editor);
  };
  // In idle mode, if we clicked on something, react and update our UI state.
  override handleMouseDown = () => {
    const { editor } = this;
    // Hit test, finding which element was clicked on.
    const whatd_we_hit = editor.whatdWeHit(editor.uiState.mousePos);

    if (!whatd_we_hit) {
      // Hit "blank space". De-select whatever we've got.
      return editor.deselect();
    }
    // Select the clicked-on entity and react based on its type.
    const { entityKind } = whatd_we_hit;
    switch (entityKind) {
      // "Movable" entities. Start moving them.
      case EntityKind.SchPort:
      case EntityKind.Instance: {
        editor.uiState.modeHandler = MoveInstance.start(editor, whatd_we_hit);
        return editor.select(whatd_we_hit);
      }
      case EntityKind.Label: {
        editor.uiState.modeHandler = EditLabel.start(editor, whatd_we_hit);
        return editor.select(whatd_we_hit);
      }
      case EntityKind.Wire: {
        // Select the wire
        return editor.select(whatd_we_hit);
      }
      case EntityKind.InstancePort: {
        // FIXME: start drawing a wire.
        break;
      }
      case EntityKind.Dot: {
        // FIXME: probably do nothing? Sort it out.
        break;
      }
      default:
        throw exhaust(entityKind);
    }
  };
  // Handle keystrokes.
  override handleKey = (e: KeyboardEvent) => {
    const { editor } = this;

    // All other UI states: check for "command" keystrokes.
    switch (e.key) {
      case Keys.Delete:
      case Keys.Backspace: {
        // Delete the selected entity
        return editor.deleteSelectedEntity();
      }
      // Mode-Changing Command Keys
      case Keys.i:
        return this.startAddInstance();
      case Keys.p:
        return this.startAddPort();
      case Keys.w:
        return this.startDrawWire();
      // Rotation & refelection
      // Note these are versions of rotation & reflection which *are*
      // added to the undo/redo changelog.
      case Keys.r:
        return editor.rotateSelected();
      case Keys.v:
        return editor.flipSelected(Direction.Vert);
      case Keys.h:
        return editor.flipSelected(Direction.Horiz);
      default:
        // Note this *is not* an exhaustive check, on purpose.
        // There's lots of keys we don't care about!
        // Some day the logging should go away too.
        console.log(`Key we dont use: '${e.key}'`);
    }
  };
  // We're already in idle mode.
  // On `abort`, just de-select anything highlighted.
  abort = () => this.editor.deselect();
}
