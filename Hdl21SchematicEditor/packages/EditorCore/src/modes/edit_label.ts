import { Label } from "../drawing";
import { Keys } from "../keys";
import { ChangeKind } from "../changes";
import { SchEditor } from "../editor";
import { UiModes, UiModeHandlerBase } from "./base";

export class EditLabel extends UiModeHandlerBase {
  mode: UiModes.EditLabel = UiModes.EditLabel;
  constructor(editor: SchEditor, public label: Label, public orig: string) {
    super(editor);
  }

  // Set the state of the Panels to use ours. Which is to say, none.
  updatePanels = () => {
    const { panelProps } = this.editor.uiState;
    this.editor.updatePanels({
      ...panelProps,
      controlPanel: {
        items: [],
      },
    });
  };
  
  static start(editor: SchEditor, label: Label) {
    const orig = structuredClone(label.text);
    const me = new EditLabel(editor, label, orig);
    me.updatePanels();
    return me;
  }

  abort = () => {
    const { editor, label, orig } = this;
    label.update(orig);
    editor.deselect();
    editor.goUiIdle();
  };

  // Add or remove a character from a `Label`.
  // Text editing is thus far pretty simplistic.
  // The "cursor" is always implicitly at the end of each Label.
  // Backspace removes the last character, and we do what we can to filter down to characters
  // which can be added to Labels - i.e. not "PageDown", "DownArrow" and the like.
  override handleKey = (e: KeyboardEvent) => {
    const { editor, label } = this;

    if (e.key === Keys.Enter) {
      // Done editing. Commit the label change.
      return this.commitEditLabel();
    }
    let text = label.text;

    if (e.key === Keys.Backspace) {
      // Subtract last character of the label
      return label.update(text.slice(0, text.length - 1));
    }
    // Filter down to "identifier characters": letters, numbers, and underscores.
    if (e.key.length !== 1 || e.key === Keys.Space) {
      return;
    }

    // Add the character to the label.
    return label.update(text + e.key);
  };
  // Done editing. Commit the label change.
  commitEditLabel = () => {
    const { editor, label } = this;
    editor.logChange({
      kind: ChangeKind.EditText,
      label,
      from: this.orig,
      to: structuredClone(label.text),
    });
    editor.deselect();
    editor.goUiIdle();
  };
}
