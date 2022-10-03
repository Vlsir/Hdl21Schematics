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
}


export class EditLabel extends UiModeHandlerBase {
  mode: UiModes.EditLabel = UiModes.EditLabel;
  constructor(editor: SchEditor, public label: Label, public orig: string) {
    super(editor);
  }
  static start(editor: SchEditor, label: Label) {
    const orig = structuredClone(label.text);
    return new EditLabel(editor, label, orig);
  }

  // Add or remove a character from a `Label`.
  // Text editing is thus far pretty primitive.
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

export class DrawWire extends UiModeHandlerBase {
  mode: UiModes.DrawWire = UiModes.DrawWire;
  constructor(editor: SchEditor, public wire: Wire) {
    super(editor);
  }
  // Enter the `DrawWire` mode, and create the tentative Wire.
  static start(editor: SchEditor): DrawWire {
    const start = nearestOnGrid(editor.uiState.mouse_pos);
    const wire = new Wire([start, structuredClone(start)]);
    wire.draw();
    editor.select(wire);
    return new DrawWire(editor, wire);
  }
  // Update the rendering of an in-progress wire.
  updateDrawWire = () => {
    const { editor, wire } = this;

    // Get the active Wire, its points, and the second-to-last one for relative calculations.
    let points = wire.points;
    const prev_point = points[wire.points.length - 2];

    // Sort out the closest Manhattan-separated point on the grid.
    const landing = nearestManhattan(editor.uiState.mouse_pos, prev_point);

    // Chop out the last point, replacing it with the new landing point.
    points = points.slice(0, -1);
    points.push(landing);

    // Update the wire and redraw it.
    wire.points = points;
    wire.draw();
  };
  // Add a new wire vertex to the currently-drawn wire.
  addWireVertex = () => {
    const { editor, wire } = this;

    // Get the active Wire, its points, and the second-to-last one for relative calculations.
    let points = wire.points;
    const prev_point = points[wire.points.length - 2];

    // Sort out the closest Manhattan-separated point on the grid.
    const landing = nearestManhattan(editor.uiState.mouse_pos, prev_point);
    if (landing.x == prev_point.x && landing.y == prev_point.y) {
      // If editor is the same point, no need to make updates, we're done.
      return;
    }

    // Chop out the last point, replacing it with *two* of the landing point.
    points = points.slice(0, -1);
    points.push(landing);
    points.push(structuredClone(landing));

    // Update the wire and redraw it.
    wire.points = points;
    wire.draw();
  };
  // Commit the currently-drawn wire to the schematic.
  commitWire = () => {
    const { editor, wire } = this;

    // Add the wire to the schematic.
    editor.schematic.addWire(wire);

    // Notify the changeLog and platform of the change.
    editor.logChange({ kind: ChangeKind.Add, entity: wire });

    // And go back to the UI Idle, nothing selected state.
    editor.deselect();
    editor.goUiIdle();

    // FIXME: editor will probably want some more computing at commit-time,
    // figuring out hit-test areas, etc.
  };
  // Update the rendering of the wire on mouse-move.
  override handleMouseMove = () => this.updateDrawWire();
  // Add a vertex on mouse-up, i.e. the end of a click
  override handleMouseUp = () => this.addWireVertex();
  // Commit on double-clicks
  override handleDoubleClick = () => this.commitWire();
}
export class Pan extends UiModeHandlerBase {
  mode: UiModes.Pan = UiModes.Pan;
  static start(editor: SchEditor) {
    return new Pan(editor);
  }
}
