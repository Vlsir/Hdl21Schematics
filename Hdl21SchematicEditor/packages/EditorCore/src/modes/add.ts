/*
 * # Add Instance/ Port Mode Handler
 */

// Local Imports
import { Element, elementLib, PortElement, portLib } from "SchematicsCore";
import { Instance, SchPort } from "../drawing";
import { nearestOnGrid } from "../drawing/grid";
import { ChangeKind } from "../changes";
import { SchEditor } from "../editor";
import { ControlPanelItem } from "../panels";
import { UiModes, UiModeHandlerBase } from "./base";

// Base Class for shared logic between `AddInstance` and `AddPort`.
abstract class AddBase extends UiModeHandlerBase {
  // Get the Entity being added.
  abstract entity(): Instance | SchPort;

  // On abort, remove the entity and return to `Idle`.
  override abort = () => {
    this.editor.deselect();
    this.entity().abort();
    this.editor.goUiIdle();
  };

  // Get the list of control panel items for this mode.
  abstract controlPanelItems(): Array<ControlPanelItem>;

  // Set the state of the Panels to use ours.
  updatePanels = () => {
    const { panelProps } = this.editor.uiState;
    this.editor.updatePanels({
      ...panelProps,
      controlPanel: {
        items: this.controlPanelItems(),
      },
    });
  };

  // Update the location of our in-progress entity.
  updateLoc = () => {
    const entity = this.entity();
    entity.data.loc = nearestOnGrid(this.editor.uiState.mousePos.canvas);
    entity.draw();
  };

  // Update the location on mouse-move.
  override handleMouseMove = () => this.updateLoc();

  // Add the currently-pending entity to the schematic.
  commit = () => {
    const { editor } = this;
    // FIXME: update dots incrementally, instead of re-inferring them all!
    editor.schematic.updateDots();
    const entity = this.entity();

    // Add it to to the schematic.
    editor.schematic.addEntity(entity);

    // Notify the changeLog and platform of the change.
    editor.logChange({ kind: ChangeKind.Add, entity });

    editor.deselect();
    editor.goUiIdle();
  };

  // Commit the instance on mouse-up, i.e. the end of a click to place it.
  override handleMouseUp = () => this.commit();
}

// # Add Instance Mode
// Tracks the pending Instance, which until `commit` time is not added to the schematic.
export class AddInstance extends AddBase {
  mode: UiModes.AddInstance = UiModes.AddInstance;
  constructor(editor: SchEditor, public instance: Instance) {
    super(editor);
  }

  // Create the provisional `Instance`, using the last one added as a template.
  static start(editor: SchEditor): AddInstance {
    const { lastInstanceData } = editor.uiState;
    const { element, kind } = lastInstanceData;

    const newInstanceData = {
      name: `${element.defaultNamePrefix}${editor.schematic.num_instances}`,
      of: `${element.defaultOf}`,
      kind,
      element,
      loc: nearestOnGrid(editor.uiState.mousePos.canvas),
      orientation: structuredClone(lastInstanceData.orientation),
    };
    editor.uiState.lastInstanceData = newInstanceData;

    // Create the provisional `Instance`. Note it is *not* added to the schematic yet.
    const instance = Instance.create(newInstanceData);

    // Update our UI state.
    editor.select(instance);

    // And draw the instance.
    instance.draw();
    const me = new AddInstance(editor, instance);
    me.updatePanels();
    return me;
  }

  // Derive our control panel items from the element list.
  override controlPanelItems = () => {
    const itemFromElement = (element: Element): ControlPanelItem => ({
      text: element.kind,
      icon: null, // FIXME! get some icons
      shortcutKey: element.keyboardShortcut,
      onClick: () => this.changeInstanceKind(element),
    });
    return elementLib.list.map(itemFromElement);
  };

  // Handle a keystroke, potentially producing a change of kind.
  override handleKey = (e: KeyboardEvent) => {
    const element = elementLib.keyboardShortcuts.get(e.key);
    if (element) {
      return this.changeInstanceKind(element);
    }
  };

  // Change the kind of the instance.
  changeInstanceKind = (element: Element) => {
    const { instance } = this;

    // Update the instance data
    instance.data.kind = element.kind;
    instance.data.element = element;
    instance.data.name = element.defaultNamePrefix;
    instance.data.of = element.defaultOf;

    // Update its label data
    instance.nameLabel!.data.text = element.defaultNamePrefix;
    instance.nameLabel!.data.loc = element.nameloc;
    instance.ofLabel!.data.text = element.defaultOf;
    instance.ofLabel!.data.loc = element.ofloc;

    // Store this as the last instance data for next time
    this.editor.uiState.lastInstanceData = instance.data;

    // And redraw it
    instance.draw();
  };

  // Our entity is our Instance
  entity = () => this.instance;
}

// # Add Port Mode
export class AddPort extends AddBase {
  mode: UiModes.AddPort = UiModes.AddPort;
  constructor(editor: SchEditor, public port: SchPort) {
    super(editor);
  }

  // Create a new Port and start moving it around.
  static start(editor: SchEditor) {
    // Create the provisional `Port`, using the last one added as a template.
    const { lastPortData } = editor.uiState;
    const { kind, portElement } = lastPortData;
    const newPortData = {
      name: `${portElement.defaultName}`,
      kind,
      portElement,
      loc: nearestOnGrid(editor.uiState.mousePos.canvas),
      orientation: structuredClone(lastPortData.orientation),
    };
    editor.uiState.lastPortData = newPortData;

    // Create the provisional `Port`. Note it is *not* added to the schematic yet.
    const port = SchPort.create(newPortData);

    // Update our UI state.
    editor.select(port);

    // And draw the port.
    port.draw();
    const me = new AddPort(editor, port);
    me.updatePanels();
    return me;
  }

  // Derive our control panel items from the port symbols list.
  override controlPanelItems = () => {
    const itemFromElement = (portElement: PortElement): ControlPanelItem => ({
      text: portElement.kind,
      icon: null, // FIXME! get some icons
      shortcutKey: portElement.keyboardShortcut,
      onClick: () => this.changePortKind(portElement),
    });
    return portLib.list.map(itemFromElement);
  };

  // Handle a keystroke, potentially producing a change of kind.
  override handleKey = (e: KeyboardEvent) => {
    const portElement = portLib.keyboardShortcuts.get(e.key);
    if (portElement) {
      // We hit a shortcut key and have a valid new type
      return this.changePortKind(portElement);
    }
  };

  // Change the `PortKind` of the in-progress `Port`.
  changePortKind = (portElement: PortElement) => {
    const { editor, port } = this;

    // Update the port data
    port.data.kind = portElement.kind;
    port.data.portElement = portElement;
    port.data.name = portElement.defaultName;

    // Update its Label data
    port.nameLabel!.data.text = portElement.defaultName;
    port.nameLabel!.data.loc = portElement.nameloc;

    // Store this as the last port data for next time
    editor.uiState.lastPortData = port.data;

    // And redraw it
    port.draw();
  };

  // Our entity is our Port
  entity = () => this.port;
}
