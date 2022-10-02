/*
 * # UI Mode Handlers
 */

import { Keys } from "./keys";
import { Label } from "./label";
import { Place } from "./place";
import { ChangeKind } from "./changes";
import { nearestOnGrid, nearestManhattan } from "./grid";
import { Primitive, primitiveLib } from "./primitive";

import { portLib, PortSymbol } from "./portsymbol";
import { EntityKind } from "./entity";
import { SchEditor } from "./editor";
import { exhaust } from "./errors";
import { Instance, SchPort, Wire } from "./drawing";
import { ControlPanels, updatePanels } from "./panels";

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

abstract class UiModeHandlerBase {
  abstract mode: UiModes;
  constructor(public editor: SchEditor) {}
  handleKey = (e: KeyboardEvent) => {};
  handleMouseDown = () => {};
  handleMouseUp = () => {};
  handleDoubleClick = () => {};
  handleMouseMove = () => {};
}
export class Idle extends UiModeHandlerBase {
  mode: UiModes.Idle = UiModes.Idle;
  static start(editor: SchEditor) {
    updatePanels({ controlPanel: { whichKind: ControlPanels.ActionList } });
    return new Idle(editor);
  }
  // In idle mode, if we clicked on something, react and update our UI state.
  override handleMouseDown = () => {
    const { editor } = this;
    // Hit test, finding which element was clicked on.
    const whatd_we_hit = editor.whatdWeHit(editor.uiState.mouse_pos);

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
        editor.uiState.modeHandler = ModeHandlers.MoveInstance.start(
          editor,
          whatd_we_hit
        );
        return editor.select(whatd_we_hit);
      }
      case EntityKind.Label: {
        editor.uiState.modeHandler = ModeHandlers.EditLabel.start(
          editor,
          whatd_we_hit
        );
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
}
// # Add Instance Mode
// Tracks the pending Instance, which until `commit` time is not added to the schematic.
export class AddInstance extends UiModeHandlerBase {
  mode: UiModes.AddInstance = UiModes.AddInstance;
  constructor(editor: SchEditor, public instance: Instance) {
    super(editor);
  }

  // Create the provisional `Instance`, using the last one added as a template.
  static start(editor: SchEditor): AddInstance {
    const { lastInstanceData } = editor.uiState;
    const { primitive, kind } = lastInstanceData;

    const newInstanceData = {
      name: `${primitive.defaultNamePrefix}${editor.schematic.num_instances}`,
      of: `${primitive.defaultOf}`,
      kind,
      primitive,
      loc: nearestOnGrid(editor.uiState.mouse_pos),
      orientation: structuredClone(lastInstanceData.orientation),
    };
    editor.uiState.lastInstanceData = newInstanceData;

    // Create the provisional `Instance`. Note it is *not* added to the schematic yet.
    const instance = Instance.create(newInstanceData);

    // Update our UI state.
    editor.uiState.pending_entity = instance;
    editor.select(instance);
    updatePanels({ controlPanel: { whichKind: ControlPanels.PrimList } });

    // And draw the instance.
    instance.draw();
    return new AddInstance(editor, instance);
  }
  // Handle a potential change-type keypress. Update the instance kind if the key is in the map.
  override handleKey = (e: KeyboardEvent) => {
    const primitive = primitiveLib.keyboardShortcuts.get(e.key);
    if (primitive) {
      return this.changeInstanceKind(primitive);
    }
  };
  changeInstanceKind = (primitive: Primitive) => {
    // We hit a shortcut key and have a valid new type
    const instance = this.instance;
    instance.data.kind = primitive.kind;
    instance.data.primitive = primitive;
    instance.data.name = primitive.defaultNamePrefix;
    instance.data.of = primitive.defaultOf;
    this.editor.uiState.lastInstanceData = instance.data;
    instance.draw();
  };
  // Update the rendering of an in-progress instance.
  updateAddInstance = () => {
    const { editor, instance } = this;
    instance.data.loc = nearestOnGrid(editor.uiState.mouse_pos);
    instance.draw();
  };
  // Add the currently-pending instance to the schematic.
  commitAddInstance = () => {
    const { editor, instance } = this;

    editor.schematic.addInstance(instance);

    // Notify the changeLog and platform of the change.
    const entity = editor.uiState.selected_entity;
    editor.logChange({ kind: ChangeKind.Add, entity });

    editor.uiState.pending_entity = null;
    editor.deselect();
    editor.goUiIdle();
  };
  // Commit the instance on mouse-up, i.e. the end of a click to place it.
  override handleMouseUp = () => this.commitAddInstance();
  // Update the rendering of the instance on mouse-move.
  override handleMouseMove = () => this.updateAddInstance();
}
export class AddPort extends UiModeHandlerBase {
  mode: UiModes.AddPort = UiModes.AddPort;
  constructor(editor: SchEditor, public port: SchPort) {
    super(editor);
  }

  // Create a new Port and start moving it around.
  static start(editor: SchEditor) {
    // Create the provisional `Port`, using the last one added as a template.
    const { lastPortData } = editor.uiState;
    const { kind, portsymbol } = lastPortData;
    const newPortData = {
      name: `${portsymbol.defaultName}`,
      kind,
      portsymbol,
      loc: nearestOnGrid(editor.uiState.mouse_pos),
      orientation: structuredClone(lastPortData.orientation),
    };
    editor.uiState.lastPortData = newPortData;

    // Create the provisional `Port`. Note it is *not* added to the schematic yet.
    const port = SchPort.create(newPortData);

    // Update our UI state.
    editor.uiState.pending_entity = port;
    editor.select(port);
    updatePanels({ controlPanel: { whichKind: ControlPanels.PortList } });

    // And draw the port.
    port.draw();
    return new AddPort(editor, port);
  }
  handleKey = (e: KeyboardEvent) => {
    const portsymbol = portLib.keyboardShortcuts.get(e.key);
    if (portsymbol) {
      // We hit a shortcut key and have a valid new type
      return this.changePortKind(portsymbol);
    }
  };
  changePortKind = (portsymbol: PortSymbol) => {
    const { editor, port } = this;

    port.data.kind = portsymbol.kind;
    port.data.portsymbol = portsymbol;
    port.data.name = portsymbol.defaultName;
    editor.uiState.lastPortData = port.data;
    port.draw();
  };
  // Update the rendering of an in-progress port.
  updateAddPort = () => {
    const { editor, port } = this;

    // Snap to our grid
    const snapped = nearestOnGrid(editor.uiState.mouse_pos);
    // Set the location of both the port and its drawing
    port.data.loc = snapped;
    port.draw();
  };
  // Add the currently-pending port to the schematic.
  commitAddPort = () => {
    const { editor, port } = this;

    editor.schematic.addPort(port);

    // Notify the changeLog and platform of the change.
    editor.uiState.changeLog.add({ kind: ChangeKind.Add, entity: port });

    editor.uiState.pending_entity = null;
    editor.deselect();
    editor.goUiIdle();
  };
  // Commit the port on mouse-up, i.e. the end of a click to place it.
  override handleMouseUp = () => this.commitAddPort();
  // Update the rendering of the port on mouse-move.
  override handleMouseMove = () => this.updateAddPort();
}
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
    const loc = nearestOnGrid(editor.uiState.mouse_pos);
    this.to.loc = structuredClone(loc);
    entity.data.loc = structuredClone(loc);
    entity.draw();
  };

  // "Commit" a move by placing it in the change log.
  // Actual moves and re-draws are performed "live" as the mouse moves.
  commitMove = () => {
    const { editor, entity, from, to } = this;
    // Notify the changeLog and platform of the change.
    editor.logChange({
      kind: ChangeKind.Move,
      entity,
      from,
      to,
    });
    editor.goUiIdle();
  };
  // Commit the move on mouse-up
  override handleMouseUp = () => this.commitMove();
  // Update the rendering of the instance on mouse-move.
  override handleMouseMove = () => this.updateMove();
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
  handleKey = (e: KeyboardEvent) => {
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
  // Removes it from `selected_entity` and adds it to the schematic.
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

// The union-type of all the UiModeHandlers.
export type UiModeHandler =
  | Idle
  | AddInstance
  | AddPort
  | MoveInstance
  | EditLabel
  | DrawWire
  | Pan;

// And an object "namespace" for access to them.
export const ModeHandlers = {
  Idle,
  AddInstance,
  AddPort,
  MoveInstance,
  EditLabel,
  DrawWire,
  Pan,
};
