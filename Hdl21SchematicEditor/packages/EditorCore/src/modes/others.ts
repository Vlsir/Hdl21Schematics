/*
 * # UI Mode Handlers
 * All the "others" that haven't been filed into modules.
 */

import { SchEditor } from "../editor";
import { UiModes, UiModeHandlerBase } from "./base";

// # Before Startup
//
// A dummy handler which does nothing, but allows us to defer our construction-time
// dependencies between the mode handler, editor, and UI state until start-time,
// when all three are fully formed.
//
export class BeforeStartup extends UiModeHandlerBase {
  mode: UiModes.BeforeStartup = UiModes.BeforeStartup;
}

// # Edit Prelude
//
// Actual editing of the text is handled by its input element.
// This mode largely removes the shortcut keys, while retaining the mode-changing control panel list.
//
export class EditPrelude extends UiModeHandlerBase {
  mode: UiModes.EditPrelude = UiModes.EditPrelude;

  // Internal data
  constructor(
    editor: SchEditor,
    public orig: string // Original text, as of mode entry
  ) {
    super(editor);
  }

  // Set the state of the Panels to use ours. Which is to say, none.
  // FIXME: should we keep the `Idle` mode panels instead? 
  // Probably, but it'll require piping some more stuff around. 
  updatePanels = () => {
    const { panelProps } = this.editor.uiState;
    this.editor.updatePanels({
      ...panelProps,
      controlPanel: {
        items: [],
      },
    });
  };

  static start(editor: SchEditor, orig: string) {
    const me = new EditPrelude(editor, orig);
    me.updatePanels();
    return me;
  }
  // Revert to the initial text on abort
  abort = () => {
    this.editor.updateCodePrelude(this.orig);
    this.editor.deselect();
    this.editor.goUiIdle();
  };
}

// # Panning, in the sense of scrolling, Mode
// FIXME: Experimental and not safe for work.
export class Pan extends UiModeHandlerBase {
  mode: UiModes.Pan = UiModes.Pan;
}
