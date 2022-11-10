import { Wire } from "../drawing";
import { nearestOnGrid, nearestManhattan } from "../drawing/grid";
import { ChangeKind } from "../changes";
import { SchEditor } from "../editor";
import { UiModes, UiModeHandlerBase } from "./base";

export class DrawWire extends UiModeHandlerBase {
  mode: UiModes.DrawWire = UiModes.DrawWire;
  constructor(editor: SchEditor, public wire: Wire) {
    super(editor);
  }

  // Enter the `DrawWire` mode, and create the tentative Wire.
  static start(editor: SchEditor): DrawWire {
    const start = nearestOnGrid(editor.uiState.mousePos.canvas);
    const wire = new Wire([start, structuredClone(start)]);
    wire.draw();
    editor.select(wire);
    const me = new DrawWire(editor, wire);
    me.updatePanels();
    return me;
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

  // Update the rendering of an in-progress wire.
  updateDrawWire = () => {
    const { editor, wire } = this;

    // Get the active Wire, its points, and the second-to-last one for relative calculations.
    let points = wire.points;
    const prev_point = points[wire.points.length - 2];

    // Sort out the closest Manhattan-separated point on the grid.
    const landing = nearestManhattan(
      editor.uiState.mousePos.canvas,
      prev_point
    );

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
    const landing = nearestManhattan(
      editor.uiState.mousePos.canvas,
      prev_point
    );
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
    // FIXME: update dots incrementally, instead of re-inferring them all!
    editor.schematic.updateDots();

    // And go back to the UI Idle, nothing selected state.
    editor.deselect();
    editor.goUiIdle();
  };

  // Update the rendering of the wire on mouse-move.
  override handleMouseMove = () => this.updateDrawWire();
  // Add a vertex on mouse-up, i.e. the end of a click
  override handleMouseUp = () => this.addWireVertex();
  // Commit on double-clicks
  override handleDoubleClick = () => this.commitWire();

  abort = () => {
    const { editor, wire } = this;
    wire.abort();
    editor.deselect();
    editor.goUiIdle();
  };
}
