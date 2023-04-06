/*
 * # Move Mode Handler
 */

// Local Imports
import { Direction, Place } from "SchematicsCore";
import { Instance, SchPort } from "../drawing";
import { nearestOnGrid } from "../drawing/grid";
import { Keys } from "../keys";
import { ChangeKind } from "../changes";
import { SchEditor } from "../editor";
import { UiModes, UiModeHandlerBase } from "./base";

export class MoveInstance extends UiModeHandlerBase {
  mode: UiModes.MoveInstance = UiModes.MoveInstance;
  constructor(
    editor: SchEditor,
    public entity: Instance | SchPort,
    public from: Place,
    public to: Place
  ) {
    super(editor);
  }
  static start(editor: SchEditor, entity: Instance | SchPort) {
    const place = {
      loc: entity.data.loc,
      orientation: entity.data.orientation,
    };
    const from = structuredClone(place);
    const to = structuredClone(place);
    return new MoveInstance(editor, entity, from, to);
  }

  // Update the rendering of an in-progress instance move.
  updateMove = () => {
    const { editor, entity } = this;
    // Set the location of both the entity and its drawing, snapped to our grid.
    const loc = nearestOnGrid(editor.uiState.mousePos.canvas);
    this.to.loc = structuredClone(loc);
    entity.data.loc = structuredClone(loc);
    entity.draw();
  };

  // "Commit" a move by placing it in the change log.
  // Actual moves and re-draws are performed "live" as the mouse moves.
  commitMove = () => {
    const { editor, entity, from, to } = this;
    // FIXME: update dots incrementally, instead of re-inferring them all!
    editor.schematic.updateDots();
    // Notify the changeLog and platform of the change.
    editor.logChange({
      kind: ChangeKind.Move,
      entity,
      from,
      to,
    });
    editor.goUiIdle();
  };
  // Handle keystrokes.
  override handleKey = (e: KeyboardEvent) => {
    const { entity } = this;

    // All other UI states: check for "command" keystrokes.
    switch (e.key) {
      // FIXME: do we want deletion/ removal in this state? None for now.
      //   case Keys.Delete:
      //   case Keys.Backspace: {
      //     // Delete the selected entity
      //     return editor.deleteSelectedEntity();
      //   }
      // Rotation & refelection
      // Note these *are not* commited to the changelog.
      // Mid-move rotations or reflections "count as part of" the move in this sense.
      case Keys.r:
        return entity.rotate();
      case Keys.v:
        return entity.flip(Direction.Vert);
      case Keys.h:
        return entity.flip(Direction.Horiz);
      default:
        // Note this *is not* an exhaustive check, on purpose.
        // There's lots of keys we don't care about!
        // Some day the logging should go away too.
        console.log(`Key we dont use: '${e.key}'`);
    }
  };
  // Commit the move on mouse-up
  override handleMouseUp = () => this.commitMove();
  // Update the rendering of the instance on mouse-move.
  override handleMouseMove = () => this.updateMove();

  // On abort, send our entity back to its original location.
  abort = () => {
    const { editor, entity, from } = this;
    entity.data.loc = from.loc;
    entity.data.orientation = from.orientation;
    entity.draw();
    editor.deselect();
    editor.goUiIdle();
  };
}
