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
import { Keys } from "./keys";
import { exhaust } from "./errors";
import { Change, ChangeKind } from "./changes";
import { Point, point } from "./point";
import { Direction } from "./direction";
import { Importer, Exporter } from "./svg";
import { nextRotation } from "./orientation";
import { UiState } from "./uistate";
import { UiModes, ModeHandlers } from "./modes";
// import { theCanvas } from "./canvas";
// import { setupGrid } from "./grid";
import { Entity, EntityKind, Schematic, setupGrid, theCanvas } from "./drawing";

// A dummy "Platform", which does nothing, and stands in for a real one between Editor construction and startup.
const NoPlatform = {
  sendMessage: (msg: Message) => {},
  registerMessageHandler: (handler: MessageHandler) => {},
};

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
  schematic: Schematic = new Schematic();
  uiState: UiState = new UiState(this);
  failer: (msg: string) => void = console.log; // Function called on errors

  // Editor startup
  // Sets the `platform` attribute, and does all our one-time startup activity.
  // This can be called (usefully) exactly once.
  start(platform: Platform) {
    if (this.platform !== NoPlatform) {
      return; // We've already started, and won't start again.
    }
    this.platform = platform;

    // Perform all of our one-time startup activity, binding events, etc.
    window.addEventListener("wheel", this.handleWheel);
    window.addEventListener("keydown", this.handleKey);
    window.addEventListener("mousedown", this.handleMouseDown, true);
    window.addEventListener("mouseup", this.handleMouseUp, true);
    window.addEventListener("mousemove", this.handleMouseMove, true);
    window.addEventListener("dblclick", this.handleDoubleClick);
    // window.addEventListener("click", this.handleClick);
    // window.addEventListener('resize', this.handleResize);

    // Attach the drawing canvas to the DOM
    // FIXME: the event handlers probably need to move there too.
    theCanvas.attach();

    // Register our message-handler with the platform.
    this.platform.registerMessageHandler(this.handleMessage);

    // Send a message back to the main process, to indicate this has all run.
    this.platform.sendMessage({ kind: MessageKind.RendererUp });
  }
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

    // And draw the loaded schematic
    this.schematic.draw();
  };
  // Go to the "UI Idle" state, in which nothing is moving, being drawn, or really doing anything.
  goUiIdle = () => {
    this.uiState.modeHandler = ModeHandlers.Idle.start(this);
  };
  // Handle zoom via the mouse scroll wheel.
  handleWheel = (e: WheelEvent) => {
    // FIXME: not quite ready.
    // const dy = (e.wheelDeltaY || - e.deltaY) / 1000;
    // theCanvas.zui.zoomBy(dy, e.clientX, e.clientY);
  };
  // Handle keystrokes.
  handleKey = (e: KeyboardEvent) => {
    // Always go back to idle mode on escape.
    if (e.key === Keys.Escape) {
      this.deselect();
      this.abortPending();
      return this.goUiIdle();
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
    const { mode } = this.uiState.modeHandler;
    switch (mode) {
      // Delegate keystrokes in these modes to their mode handlers.
      case UiModes.EditLabel:
      case UiModes.AddInstance:
      case UiModes.AddPort:
      case UiModes.DrawWire:
        return this.uiState.modeHandler.handleKey(e);
      default: {
      }
    }
    // All other UI states: check for "command" keystrokes.
    switch (e.key) {
      case Keys.Delete:
      case Keys.Backspace: {
        // Delete the selected entity
        return this.deleteSelectedEntity();
      }
      // FIXME: if already in these states, we start a new entity without *really* finishing the pending one!
      case Keys.i:
        this.uiState.modeHandler = ModeHandlers.AddInstance.start(this);
        return;
      case Keys.p:
        this.uiState.modeHandler = ModeHandlers.AddPort.start(this);
        return;
      case Keys.w:
        this.uiState.modeHandler = ModeHandlers.DrawWire.start(this);
        return;
      // Rotation & refelection
      case Keys.r:
        return this.rotateSelected();
      case Keys.v:
        return this.flipSelected(Direction.Vert);
      case Keys.h:
        return this.flipSelected(Direction.Horiz);
      // Save with... comma(?). FIXME: modifier keys plz!
      case Keys.Comma:
        return this.sendSaveFile();
      default:
        // Note this *is not* an exhaustive check, on purpose.
        // There's lots of keys we don't care about!
        // Some day the logging should go away too.
        console.log(`Key we dont use: '${e.key}'`);
    }
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
        console.log(change);
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
  // Abort a pending change/ entity.
  // FIXME: this doesn't totally work with the undo change-log,
  // probably needs to be delegated to mode-handlers.
  abortPending() {
    if (this.uiState.pending_entity) {
      this.uiState.pending_entity.abort();
    }
    this.uiState.pending_entity = null;
  }
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
    if (!this.uiState.selected_entity) {
      return;
    }
    const { entityKind } = this.uiState.selected_entity;
    if (
      !(entityKind === EntityKind.Instance || entityKind === EntityKind.SchPort)
    ) {
      return;
    }

    // We have a flippable selected entity. Flip it.
    const obj = this.uiState.selected_entity;
    // Before modifiying the entity, clone its location data for change logging.
    const placeFrom = structuredClone({
      loc: obj.data.loc,
      orientation: obj.data.orientation,
    });

    // Always flip vertically. Horizontal flips are comprised of a vertical flip and two rotations.
    obj.data.orientation.reflected = !obj.data.orientation.reflected;
    if (dir === Direction.Horiz) {
      obj.data.orientation.rotation = nextRotation(
        nextRotation(obj.data.orientation.rotation)
      );
    }
    obj.draw();

    // And clone the resulting location data for change logging.
    const placeTo = structuredClone({
      loc: obj.data.loc,
      orientation: obj.data.orientation,
    });

    // Notify the changeLog and platform of the change.
    this.logChange({
      kind: ChangeKind.Move,
      entity: this.uiState.selected_entity,
      from: placeFrom,
      to: placeTo,
    });
  };
  // Rotate the selected entity by 90 degrees, if one is selected.
  rotateSelected = () => {
    if (!this.uiState.selected_entity) {
      return;
    }
    const { entityKind } = this.uiState.selected_entity;
    if (
      !(entityKind === EntityKind.Instance || entityKind === EntityKind.SchPort)
    ) {
      return;
    }

    // We have a selected Instance. Rotate it.
    const obj = this.uiState.selected_entity;
    // Before modifiying the entity, clone its location data for change logging.
    const placeFrom = structuredClone({
      loc: obj.data.loc,
      orientation: obj.data.orientation,
    });

    obj.data.orientation.rotation = nextRotation(obj.data.orientation.rotation);
    obj.draw();

    // And clone the resulting location data for change logging.
    const placeTo = structuredClone({
      loc: obj.data.loc,
      orientation: obj.data.orientation,
    });

    // Notify the changeLog and platform of the change.
    this.logChange({
      kind: ChangeKind.Move,
      entity: this.uiState.selected_entity,
      from: placeFrom,
      to: placeTo,
    });
  };
}

// Our sole export: the editor singleton.
export const theEditor = new SchEditor();
