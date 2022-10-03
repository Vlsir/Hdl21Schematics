/*
 * # Add Instance/ Port Mode Handler
 */

import { Instance, SchPort } from "../drawing";
import { nearestOnGrid } from "../drawing/grid";
import { ChangeKind } from "../changes";
import { Primitive, PrimitiveKind, primitiveLib } from "../primitive";
import { PortKind, portLib, PortSymbol } from "../portsymbol";
import { SchEditor } from "../editor";
import { ControlPanelItem, updatePanels } from "../panels";

import { UiModes, UiModeHandlerBase } from "./base";

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

    // And draw the instance.
    instance.draw();
    const me = new AddInstance(editor, instance);
    me.updatePanels();
    return me;
  }
  // Set the state of the Panels are entry time
  updatePanels = () => {
    const instancePanelItems: Array<ControlPanelItem> = [
      {
        text: "Nmos",
        icon: null,
        shortcutKey: null,
        onClick: () =>
          this.changeInstanceKind(primitiveLib.get(PrimitiveKind.Nmos)),
      },
      {
        text: "Pmos",
        icon: null,
        shortcutKey: null,
        onClick: () =>
          this.changeInstanceKind(primitiveLib.get(PrimitiveKind.Pmos)),
      },
      {
        text: "Edit Prelude",
        icon: null,
        shortcutKey: null,
        onClick: () => console.log("Edit Prelude"),
      },
    ];
    const { panelProps } = this.editor.uiState;
    updatePanels({
      ...panelProps,
      controlPanel: {
        items: instancePanelItems,
      },
    });
  };
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

    // Add the instance to the schematic.
    editor.schematic.addInstance(instance);

    // Notify the changeLog and platform of the change.
    editor.logChange({ kind: ChangeKind.Add, entity: instance });

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

    // And draw the port.
    port.draw();
    const me = new AddPort(editor, port);
    me.updatePanels();
    return me;
  }
  // Set the state of the Panels are entry time
  updatePanels = () => {
    const instancePanelItems: Array<ControlPanelItem> = [
      {
        text: "Input",
        icon: null,
        shortcutKey: null,
        onClick: () => this.changePortKind(portLib.get(PortKind.Input)),
      },
      {
        text: "Output",
        icon: null,
        shortcutKey: null,
        onClick: () => this.changePortKind(portLib.get(PortKind.Output)),
      },
      {
        text: "Inout",
        icon: null,
        shortcutKey: null,
        onClick: () => this.changePortKind(portLib.get(PortKind.Inout)),
      },
    ];
    const { panelProps } = this.editor.uiState;
    updatePanels({
      ...panelProps,
      controlPanel: {
        items: instancePanelItems,
      },
    });
  };
  override handleKey = (e: KeyboardEvent) => {
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
