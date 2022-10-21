/*
 * # Hdl21 Schematics Editor
 *
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic.
 */

// Workspace Imports
import {
  Platform,
  Message,
  MessageKind,
  MessageHandler,
} from "PlatformInterface";

// Local Imports
import { PanelProps, PanelUpdater } from "./panels";
import { Keys } from "./keys";
import { exhaust } from "./errors";
import { Change, ChangeKind } from "./changes";
import { Point, point } from "./point";
import { Direction } from "./direction";
import { Importer, Exporter } from "./svg";
import { UiState } from "./uistate";
import { UiModes, ModeHandlers } from "./modes";
import { Entity, EntityKind, Schematic, setupGrid, theCanvas } from "./drawing";

// A dummy "Platform", which does nothing, and stands in for a real one between Editor construction and startup.
const NoPlatform = {
  sendMessage: (msg: Message) => {},
  registerMessageHandler: (handler: MessageHandler) => {},
};
// Kinda the same thing for the `Panels` updater-function.
const NoPanelUpdater = (_: PanelProps) => {};

// # The Schematic Editor UI
//
// The "top-level" for the schematic editor UI,
// including all UI state and the contents of the schematic.
// Includes essentially all behavior of the schematic editor;
// core attributes `schematic` and `uiState` are largely "data only".
//
// Schematic Editors communicate with an underlying "platform" via Message passing.
// The platform is responsible for tasks such as file I/O and launching the editor in the first place.
// Each platform-type implements the `Platform` interface, which consists of two methods:
// * `registerMessageHandler` - registers a callback to handle incoming messages. Called once during Editor initialization.
// * `sendMessage` - sends a message from the Editor to the Platform
//
// At construction time, each editor needs a sole attribute: its `Platform`.
// The platform is responsible for providing initial schematic content,
// after the editor is constructed and indicates it is ready via messages.
//
export class SchEditor {
  platform: Platform = NoPlatform; // Platform interface. Set upon the one (and only) call to `start`.
  schematic: Schematic = new Schematic(); // The schematic content
  uiState: UiState = new UiState(this); // Non-schematic UI state
  panelUpdater: PanelUpdater = NoPanelUpdater; // Function to update the peripheral `Panels`
  failer: (msg: string) => void = console.log; // Function called on errors

  // Editor startup
  // Sets the `platform` attribute, and does all our one-time startup activity.
  // This can be called (usefully) exactly once.
  start(platform: Platform) {
    if (this.platform !== NoPlatform) {
      return; // We've already started, and won't start again.
    }
    this.platform = platform;

    // Perform all of our one-time startup activity, creating the canvas, binding it to the DOM, binding events, etc.

    // Attach the drawing canvas to the DOM
    theCanvas.attach();

    // Listener for color-scheme changes
    // Note the Panels have separate tracking of this.
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", this.handleColorSchemeChange);
    // The key event listener seems to need to be on `window`, while mouse events are on the canvas's parent div.
    window.addEventListener("keydown", this.handleKey);
    // FIXME: where will this `wheel` event eventually attach
    window.addEventListener("wheel", this.handleWheel);
    // window.addEventListener('resize', this.handleResize);
    theCanvas.parentDomElement!.addEventListener(
      "mousedown",
      this.handleMouseDown,
      true
    );
    theCanvas.parentDomElement!.addEventListener(
      "mouseup",
      this.handleMouseUp,
      true
    );
    theCanvas.parentDomElement!.addEventListener(
      "mousemove",
      this.handleMouseMove,
      true
    );
    theCanvas.parentDomElement!.addEventListener(
      "dblclick",
      this.handleDoubleClick
    );
    // theCanvas.parentDomElement!.addEventListener("click", this.handleClick);

    // Get ourselves out of the "before startup" mode, and into UI idle.
    this.goUiIdle();

    // Register our message-handler with the platform.
    this.platform.registerMessageHandler(this.handleMessage);

    // Send a message back to the main process, to indicate this has all run.
    this.platform.sendMessage({ kind: MessageKind.RendererUp });
  }
  handleColorSchemeChange = (e: MediaQueryListEvent) => {
    // FIXME! actually react to this!
    console.log("SchEditor got color scheme change");
    console.log(e);
  };
  // Send the schematic's SVG content to the platform for saving.
  sendSaveFile = () => {
    const schData = this.schematic.toData();
    const svgContent = Exporter.export(schData);
    return this.platform.sendMessage({
      kind: MessageKind.SaveFile,
      body: svgContent,
    });
  };
  // Send a schematic-changed message back to the platform.
  sendChangeMessage = () => {
    return this.platform.sendMessage({ kind: MessageKind.Change });
  };
  // Handle incoming Messages from the platform.
  handleMessage = (msg: Message) => {
    const { kind } = msg;
    switch (kind) {
      case MessageKind.NewSchematic:
        return this.newSchematic();
      case MessageKind.LoadFile: {
        // Load schematic content from the file.
        // FIXME: error handling via Result
        try {
          const schData = Importer.import(msg.body);
          const schematic = Schematic.fromData(schData);
          return this.loadSchematic(schematic);
        } catch (e) {
          return this.failer(`Error loading schematic: ${e}`);
        }
      }
      // Messages designed to sent *from* us, to the platform.
      // Log it as out of place, and carry on.
      case MessageKind.RendererUp:
      case MessageKind.SaveFile:
      case MessageKind.LogInMain:
      case MessageKind.Change: {
        return this.failer(`Invalid message from platform to editor: ${msg}`);
      }
      default:
        throw exhaust(kind);
    }
  };
  // Load a new and empty schematic into the editor.
  newSchematic = () => {
    this.loadSchematic(new Schematic());
  };
  // Load `schematic` into the UI and draw it.
  loadSchematic = (schematic: Schematic) => {
    this.schematic = schematic;

    // Clear the drawing window, in case we have a previous drawing.
    theCanvas.clear();

    // Set up the background grid
    setupGrid(this.schematic.size);

    // Load the schematic's code-prelude into the `Panels` editor area.
    // This will also set `schematic.prelude` back to itself, but meh, it's harmless and we share that line.
    this.updateCodePrelude(schematic.prelude);

    // And draw the loaded schematic
    this.schematic.draw();
  };
  // Go to the "UI Idle" state, in which nothing is moving, being drawn, or really doing anything.
  goUiIdle = () => {
    this.uiState.modeHandler = ModeHandlers.Idle.start(this);
  };
  // Start the "Edit Prelude" state
  startEditPrelude = () => {
    this.uiState.modeHandler = ModeHandlers.EditPrelude.start(
      this,
      structuredClone(this.schematic.prelude)
    );
  };
  // Handle zoom via the mouse scroll wheel.
  handleWheel = (e: WheelEvent) => {
    // FIXME: not quite ready.
    // const dy = (e.wheelDeltaY || - e.deltaY) / 1000;
    // theCanvas.zui.zoomBy(dy, e.clientX, e.clientY);
  };
  // Handle keystrokes.
  handleKey = (e: KeyboardEvent) => {
    if (this.uiState.mode === UiModes.EditPrelude) {
      // FIXME: bailing here in favor of letting the text-input handle keystrokes.
      // This is particularly for ESCAPE, which exits the UI state, but we haven't figured out how to de-select the text input.
      return;
    }
    // Always abort any pending operation and go back to idle mode on escape.
    if (e.key === Keys.Escape) {
      return this.uiState.modeHandler.abort();
    }
    // FIXME: these OS-specific keys should probably come from the platform instead.
    if (e.metaKey && e.shiftKey && e.key === Keys.z) {
      // Command-Shift-Z: redo
      return this.redo();
    }
    if (e.metaKey && e.key === Keys.z) {
      // Command-Z: undo
      return this.undo();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Skip everything else when a modifier key is pressed.
      return;
    }
    // Save with... comma(?). FIXME: modifier keys plz!
    if (e.key === Keys.Comma) {
      return this.sendSaveFile();
    }

    // Delegate everything else to the mode-specific key handler.
    return this.uiState.modeHandler.handleKey(e);
  };
  // Log a `Change` to the change history and to the platform.
  logChange(change: Change): void {
    this.uiState.changeLog.add(change);
    this.platform.sendMessage({ kind: MessageKind.Change });
  }
  // Apply a `Change`, generally as part of an undo or redo operation.
  applyChange(change: Change): void {
    switch (change.kind) {
      case ChangeKind.Add:
        this.schematic.addEntity(change.entity);
        return change.entity.draw();

      case ChangeKind.Remove:
        return this.schematic.removeEntity(change.entity);

      case ChangeKind.Move:
        const { entity, to } = change;
        entity.data.loc = to.loc;
        entity.data.orientation = to.orientation;
        return entity.draw();

      case ChangeKind.EditText:
        change.label.update(change.to);
        return change.label.draw();

      default:
        throw exhaust(change); // Exhaustiveness check
    }
  }
  // Undo the last change, if there is one.
  undo(): void {
    const inverseChange = this.uiState.changeLog.undo();
    if (inverseChange) {
      this.applyChange(inverseChange);
    }
  }
  // Redo the last undone change, if there is one.
  redo(): void {
    const redoChange = this.uiState.changeLog.redo();
    if (redoChange) {
      this.applyChange(redoChange);
    }
  }
  // Delete the selected entity, if we have one, and it is deletable.
  deleteSelectedEntity = () => {
    if (!this.uiState.selected_entity) {
      return;
    }
    const entity = this.uiState.selected_entity;
    const { entityKind } = entity;
    switch (entityKind) {
      // Delete-able entities
      case EntityKind.SchPort:
      case EntityKind.Dot:
      case EntityKind.Wire:
      case EntityKind.Instance: {
        // Delete the selected entity
        this.deselect();
        this.schematic.removeEntity(entity);
        this.logChange({
          kind: ChangeKind.Remove,
          entity,
        });
        return this.goUiIdle();
      }
      // Non-delete-able "child" entities
      case EntityKind.Label:
      case EntityKind.InstancePort:
        return;
      default:
        throw exhaust(entityKind);
    }
  };
  // Hit test all schematic entities.
  // Returns the "highest priority" entity that is hit, or `null` if none are hit.
  whatdWeHit(point: Point): Entity | null {
    // Check all Instance Labels
    for (let [key, instance] of this.schematic.instances) {
      for (let label of instance.labels()) {
        if (label.hitTest(point)) {
          return label;
        }
      }
    }
    // Check all Port Labels
    for (let [key, port] of this.schematic.ports) {
      for (let label of port.labels()) {
        if (label.hitTest(point)) {
          return label;
        }
      }
    }
    // Check all Instance symbols / bodies
    for (let [key, instance] of this.schematic.instances) {
      if (instance.hitTest(point)) {
        return instance;
      }
    }
    // Check all Port symbols / bodies
    for (let [key, port] of this.schematic.ports) {
      if (port.hitTest(point)) {
        return port;
      }
    }
    // Check all Wires
    for (let [key, wire] of this.schematic.wires) {
      if (wire.hitTest(point)) {
        return wire;
      }
    }
    // Didn't hit anything, return null.
    return null;
  }
  // Make `entity` the selected, highlighted entity.
  select(entity: Entity): void {
    this.deselect();
    this.uiState.selected_entity = entity;
    entity.highlight();
  }
  // Deselect the highlighted entity, if any.
  deselect = () => {
    if (this.uiState.selected_entity) {
      this.uiState.selected_entity.unhighlight();
    }
    this.uiState.selected_entity = null;
  };

  // FIXME: whether we want a "click" handler, in addition to mouse up/down.
  // handleClick = e => {}

  // Handle mouse-down events. Fully delegated to the mode-handlers.
  handleMouseDown = (_: MouseEvent) =>
    this.uiState.modeHandler.handleMouseDown();
  // Handle mouse-up events. Fully delegated to the mode-handlers.
  handleMouseUp = (_: MouseEvent) => this.uiState.modeHandler.handleMouseUp();
  // Handle double-click events. Fully delegated to the mode-handlers.
  handleDoubleClick = (_: MouseEvent) =>
    this.uiState.modeHandler.handleDoubleClick();
  // Handle mouse movement events.
  handleMouseMove = (e: MouseEvent) => {
    // Update our tracking of the mouse position.
    this.uiState.mouse_pos = theCanvas.screenToCanvas(
      point(e.clientX, e.clientY)
    );
    // And delegate to the mode-handler.
    return this.uiState.modeHandler.handleMouseMove();
  };

  // Flip the selected instance, if one is selected.
  flipSelected = (dir: Direction) => {
    // FIXME: share this "filter down to Instances and SchPorts" bit
    const entity = this.uiState.selected_entity;
    if (!entity) {
      return;
    }
    const { entityKind } = entity;
    if (
      !(entityKind === EntityKind.Instance || entityKind === EntityKind.SchPort)
    ) {
      return;
    }

    // The selected entity is flippable. Flip it.
    // Before modifiying the entity, clone its location data for change logging.
    const placeFrom = structuredClone(entity.place());

    // Flip and re-draw the entity
    entity.flip(dir);

    // And clone the resulting location data for change logging.
    const placeTo = structuredClone(entity.place());

    // Notify the changeLog and platform of the change.
    this.logChange({
      kind: ChangeKind.Move,
      entity,
      from: placeFrom,
      to: placeTo,
    });
  };
  // Rotate the selected entity by 90 degrees, if one is selected.
  rotateSelected = () => {
    // FIXME: share this "filter down to Instances and SchPorts" bit
    const entity = this.uiState.selected_entity;
    if (!entity) {
      return;
    }
    const { entityKind } = entity;
    if (
      !(entityKind === EntityKind.Instance || entityKind === EntityKind.SchPort)
    ) {
      return;
    }

    // The selected entity is rotatable. Rotate it.
    // Before modifiying the entity, clone its location data for change logging.
    const placeFrom = structuredClone(entity.place());

    // Rotate and re-draw the entity
    entity.rotate();

    // And clone the resulting location data for change logging.
    const placeTo = structuredClone(entity.place());

    // Notify the changeLog and platform of the change.
    this.logChange({
      kind: ChangeKind.Move,
      entity,
      from: placeFrom,
      to: placeTo,
    });
  };
  // Update the schematic's code-prelude.
  // Note a copy of this is also kept in the `PanelProps`; this is in fact the one rendered to the screen.
  updateCodePrelude = (codePrelude: string) => {
    // Set the prelude on the `schematic`
    this.schematic.prelude = codePrelude;
    // And set it on the `Panels`
    this.updatePanels({
      ...this.uiState.panelProps,
      codePrelude: { codePrelude },
    });
  };
  // Update the peripheral `Panels`
  // Notes:
  // * We generally need to keep a copy of our `PanelProps` in the `UiState`, to enable partial edits.
  //   * Updates really need to route through here, or the `PanelProps` will get out of sync.
  // * Calling `panelUpdater` will generally re-render everything but the central schematic canvas.
  updatePanels = (props: PanelProps): void => {
    // Set the `PanelProps` in the `UiState`
    this.uiState.panelProps = props;
    // And set them on the `Panels`
    return this.panelUpdater(props);
  };
}

// Our sole export: the editor singleton.
export const theEditor = new SchEditor();
