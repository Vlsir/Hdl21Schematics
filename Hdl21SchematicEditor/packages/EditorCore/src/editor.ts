/*
 * # Hdl21 Schematics Editor
 *
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic.
 */

import { Line } from "two.js/src/shapes/line";

// Workspace Imports
import { Platform, Message, MessageKind } from "PlatformInterface";

// Local Imports
import { exhaust } from "./errors";
import { Change, ChangeKind } from "./changes";
import { Point, point } from "./point";
import { Direction } from "./direction";
import {
  PrimitiveMap,
  PrimitiveKind,
  PrimitiveKeyboardShortcuts,
} from "./primitive";
import { Importer } from "./importer";
import { Exporter } from "./exporter";
import { nextRotation } from "./orientation";
import {
  Entity,
  EntityKind,
  Schematic,
  Instance,
  Wire,
  SchPort,
} from "./drawing";
import { gridLineStyle } from "./style";
import { UiState, UiModes } from "./uistate";
import { theCanvas } from "./canvas";
import { PortKind, PortMap, PortKeyboardShortcuts } from "./portsymbol";

// Given a `Point`, return the nearest grid point.
function nearestOnGrid(loc: Point): Point {
  const grid_size = 10;
  return point(
    Math.round(loc.x / grid_size) * grid_size,
    Math.round(loc.y / grid_size) * grid_size
  );
}

// Find the nearest Manhattan-separated point on the grid relative to `relativeTo`.
function nearestManhattan(loc: Point, relativeTo: Point): Point {
  const dx = relativeTo.x - loc.x;
  const dy = relativeTo.y - loc.y;

  var landing1;
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal segment
    landing1 = point(loc.x, relativeTo.y);
  } else {
    // Vertical segment
    landing1 = point(relativeTo.x, loc.y);
  }
  return nearestOnGrid(landing1);
}

// # Keyboard Inputs
// (That we care about)
export enum Keys {
  i = "i", // Instance
  p = "p", // Port
  w = "w", // Wire
  r = "r", // Rotate
  h = "h", // Horizontal flip
  v = "v", // Vertical flip
  z = "z", // Undo / redo
  Comma = ",", // Save(?)
  Escape = "Escape", // Cancel
  Backspace = "Backspace", // Remove
  Delete = "Delete", // Remove
  Enter = "Enter", // Finish
  Space = " ", // Filter this out of names
}

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
// *
//
// At construction time, each editor needs a sole attribute: its `Platform`.
// The platform is responsible for providing initial schematic content,
// after the editor is constructed and indicates it is ready via a `renderer-up` message.
//
class SchEditor {
  platform: Platform;
  schematic: Schematic = new Schematic();
  uiState: UiState = new UiState();
  failer: (msg: string) => void = console.log; // Function called on errors

  constructor(platform: Platform) {
    this.platform = platform;

    // Perform all of our one-time startup activity, binding events, etc.
    // window.addEventListener('resize', FIXME!);
    window.addEventListener("wheel", this.handleWheel);
    window.addEventListener("keydown", this.handleKey);
    window.addEventListener("mousedown", this.handleMouseDown, true);
    window.addEventListener("mouseup", this.handleMouseUp, true);
    window.addEventListener("mousemove", this.handleMouseMove, true);
    window.addEventListener("dblclick", this.handleDoubleClick);
    // window.addEventListener("click", this.handleClick);

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
    switch (msg.kind) {
      case MessageKind.NewSchematic:
        return this.newSchematic();
      case MessageKind.LoadFile: {
        // Load schematic content from the file.
        const schData = Importer.import(msg.body);
        const schematic = Schematic.fromData(schData);
        // FIXME: error handling here
        return this.loadSchematic(schematic);
      }
      // Messages designed to sent *from* us, to the platform.
      case MessageKind.Change: {
        return this.failer(`Invalid message from platform to editor: ${msg}`);
      }
      default: {
        return this.failer(`Unknown message type: ${msg}`);
      }
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
    this.setupGrid();

    // And draw the loaded schematic
    this.schematic.draw();
  };
  // Set up the background grid
  setupGrid = () => {
    // Get the outline size from the Schematic
    const x = this.schematic.size.x;
    const y = this.schematic.size.y;

    for (let i = 0; i <= x; i += 10) {
      const line = new Line(i, 0, i, y);
      theCanvas.gridLayer.add(line);
      gridLineStyle(line, i % 100 == 0);
    }
    for (let i = 0; i <= y; i += 10) {
      const line = new Line(0, i, x, i);
      theCanvas.gridLayer.add(line);
      gridLineStyle(line, i % 100 == 0);
    }
  };
  // Go to the "UI Idle" state, in which nothing is moving, being drawn, or really doing anything.
  goUiIdle = () => {
    this.uiState.mode = UiModes.Idle;
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
      return this.redo();
    }
    if (e.metaKey && e.key === Keys.z) {
      return this.undo();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Skip everything else when a modifier key is pressed.
      return;
    }
    // In the update Text Labels state, forward all other keystrokes to its handler.
    if (this.uiState.mode === UiModes.EditLabel) {
      return this.updateEditLabel(e);
    }
    // In the pending-addition states, potentially change the kind of entity added
    if (this.uiState.mode === UiModes.AddInstance) {
      return this.changeInstanceKind(e);
    }
    if (this.uiState.mode === UiModes.AddPort) {
      return this.changePortKind(e);
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
        return this.startAddInstance();
      case Keys.p:
        return this.startAddPort();
      case Keys.w:
        return this.startDrawWire();
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
        entity.obj.data.loc = to.loc;
        entity.obj.data.orientation = to.orientation;
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
    switch (entity.kind) {
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
        // FIXME: throw exhaust(entity.kind); // Exhaustiveness check
        return this.failer(
          `deleteSelectedEntity: unknown entity kind: ${entity.kind}`
        );
    }
  };
  // Hit test all schematic entities.
  // Returns the "highest priority" entity that is hit, or `null` if none are hit.
  whatdWeHit(point: Point): Entity | null {
    /* Entity | null */
    // Check all Instance Labels
    for (let [key, instance] of this.schematic.instances) {
      for (let label of instance.labels()) {
        if (label.hitTest(point)) {
          return new Entity(EntityKind.Label, label);
        }
      }
    }
    // Check all Port Labels
    for (let [key, port] of this.schematic.ports) {
      for (let label of port.labels()) {
        if (label.hitTest(point)) {
          return new Entity(EntityKind.Label, label);
        }
      }
    }
    // Check all Instance symbols / bodies
    for (let [key, instance] of this.schematic.instances) {
      if (instance.hitTest(point)) {
        return new Entity(EntityKind.Instance, instance);
      }
    }
    // Check all Port symbols / bodies
    for (let [key, port] of this.schematic.ports) {
      if (port.hitTest(point)) {
        return new Entity(EntityKind.SchPort, port);
      }
    }
    // Check all Wires
    for (let [key, wire] of this.schematic.wires) {
      if (wire.hitTest(point)) {
        return new Entity(EntityKind.Wire, wire);
      }
    }
    // Didn't hit anything, return null.
    return null;
  }
  // Get the inner `obj` field from our selected entity, if we have one.
  selected_object(): any {
    // FIXME! return type
    if (!this.uiState.selected_entity) {
      return null;
    }
    return this.uiState.selected_entity.obj;
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
  abortPending() {
    if (this.uiState.pending_entity) {
      this.uiState.pending_entity.abort();
    }
    this.uiState.pending_entity = null;
  }
  handleMouseDown = (e: MouseEvent) => {
    // Hit test, finding which element was clicked on.
    const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

    // And react to the current UI mode.
    switch (this.uiState.mode) {
      case UiModes.Idle: {
        // In idle mode, if we clicked on something, react and update our UI state.
        if (!whatd_we_hit) {
          // Hit "blank space".
          this.deselect();
          return this.goUiIdle();
          // this.uiState.mode = UiModes.Pan;
          // this.uiState.start_mouse_pos = this.uiState.mouse_pos;
          // return;
        }
        // Select the clicked-on entity

        // And react based on its type.
        switch (whatd_we_hit.kind) {
          // "Movable" entities. Start moving them.
          case EntityKind.SchPort:
          case EntityKind.Instance: {
            this.uiState.mode = UiModes.MoveInstance;
            const place = {
              loc: whatd_we_hit.obj.data.loc,
              orientation: whatd_we_hit.obj.data.orientation,
            };
            this.uiState.pendingChange = {
              kind: ChangeKind.Move,
              entity: whatd_we_hit,
              from: structuredClone(place),
              to: structuredClone(place),
            };
            return this.select(whatd_we_hit);
          }
          case EntityKind.Label: {
            this.uiState.mode = UiModes.EditLabel;
            return this.select(whatd_we_hit);
          }
          case EntityKind.Wire: {
            // Select the wire
            return this.select(whatd_we_hit);
          }
          case EntityKind.InstancePort: {
            // FIXME: start drawing a wire.
            break;
          }
          case EntityKind.Dot: {
            // FIXME: probably do nothing? Sort it out.
            break;
          }
          default: {
            return this.failer(
              `Unknown entity kind: ${whatd_we_hit.kind} in handleMouseDown`
            );
          }
        }
        break;
      }
      case UiModes.AddInstance:
        return this.commitAddInstance();
      // case UiModes.DrawWire: return this.addWireVertex(); // Do this on mouse-up
      default:
        break;
    }
  };
  handleMouseUp = (e: MouseEvent) => {
    // // Hit test, finding which element was clicked on.
    // const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

    // And react to the current UI mode.
    switch (this.uiState.mode) {
      case UiModes.DrawWire:
        return this.addWireVertex();
      case UiModes.AddInstance:
        return this.commitAddInstance();
      case UiModes.AddPort:
        return this.commitAddPort();
      case UiModes.MoveInstance: // "Commit" the move to the change log.
        return this.commitMove();
      // Nothing to do in these modes.
      case UiModes.EditLabel:
      case UiModes.Pan:
      case UiModes.Idle:
        return;
      default:
        return this.failer(
          `handleMouseUp: unknown UI mode: ${this.uiState.mode}`
        );
    }
  };
  // // Handle mouse click events.
  // handleClick = e => {
  // }
  // Handle double-click events.
  handleDoubleClick = (e: MouseEvent) => {
    // Hit test, finding which element was clicked on.
    const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

    // And react to the current UI mode.
    switch (this.uiState.mode) {
      case UiModes.DrawWire:
        this.commitWire();
        break;
      default:
        break;
    }
  };
  // Handle mouse movement events.
  handleMouseMove = (e: MouseEvent) => {
    // Update our tracking of the mouse position.
    // const oldMouse = structuredClone(this.uiState.mouse_pos);
    this.uiState.mouse_pos = theCanvas.screenToCanvas(
      point(e.clientX, e.clientY)
    );

    // And react to the current UI mode.
    switch (this.uiState.mode) {
      case UiModes.Pan: {
        // FIXME: not quite ready for prime time.
        // // Make a panning translation.
        // // Note these units are expressed in screen pixels, not SVG/ schematic units.
        // const old = theCanvas.canvasToScreen(oldMouse);
        // const new_ = theCanvas.canvasToScreen(this.uiState.mouse_pos);
        // theCanvas.zui.translateSurface(new_.x - old.x, new_.y - old.y);
        return;
      }
      case UiModes.DrawWire:
        return this.updateDrawWire();
      case UiModes.AddInstance:
        return this.updateAddInstance();
      case UiModes.AddPort:
        return this.updateAddPort();
      case UiModes.MoveInstance:
        return this.updateMove();
      // Nothing to do in these modes.
      case UiModes.Idle:
      case UiModes.EditLabel:
        return;
      default:
        throw exhaust(this.uiState.mode); // Exhaustiveness check
    }
  };
  // Enter the `DrawWire` mode, and create the tentative Wire.
  startDrawWire = () => {
    this.uiState.mode = UiModes.DrawWire;
    const start = nearestOnGrid(this.uiState.mouse_pos);
    const wire = new Wire([start, structuredClone(start)]);
    wire.draw();
    this.select(new Entity(EntityKind.Wire, wire));
  };
  // Update the rendering of an in-progress wire.
  updateDrawWire = () => {
    // Get the active Wire, its points, and the second-to-last one for relative calculations.
    const wire = this.selected_object();
    let points = wire.points;
    const prev_point = points[wire.points.length - 2];

    // Sort out the closest Manhattan-separated point on the grid.
    const landing = nearestManhattan(this.uiState.mouse_pos, prev_point);

    // Chop out the last point, replacing it with the new landing point.
    points = points.slice(0, -1);
    points.push(landing);

    // Update the wire and redraw it.
    wire.points = points;
    wire.draw();
  };
  // Add a new wire vertex to the currently-drawn wire.
  addWireVertex = () => {
    // Get the active Wire, its points, and the second-to-last one for relative calculations.
    const wire = this.selected_object();
    let points = wire.points;
    const prev_point = points[wire.points.length - 2];

    // Sort out the closest Manhattan-separated point on the grid.
    const landing = nearestManhattan(this.uiState.mouse_pos, prev_point);
    if (landing.x == prev_point.x && landing.y == prev_point.y) {
      // If this is the same point, no need to make updates, we're done.
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
    // Add the wire to the schematic.
    const wire = this.selected_object();
    this.schematic.addWire(wire);

    // Notify the changeLog and platform of the change.
    const entity = this.uiState.selected_entity;
    this.logChange({ kind: ChangeKind.Add, entity });

    // And go back to the UI Idle, nothing selected state.
    this.deselect();
    this.goUiIdle();

    // FIXME: this will probably want some more computing at commit-time,
    // figuring out hit-test areas, etc.
  };
  // Create a new Instance
  createInstance(): Instance | void {
    // Create the provisional `Instance`.
    // Use the last one added as a template.
    const { lastInstanceData } = this.uiState;
    const { kind } = lastInstanceData;
    const prim = PrimitiveMap.get(kind) || PrimitiveMap.get(PrimitiveKind.Nmos);
    if (!prim) {
      return this.failer(`createInstance: unknown primitive kind: ${kind}`);
    }

    // FIXME: switch these based on `kind`
    const name = `${prim.defaultNamePrefix}${this.schematic.num_instances}`;
    const of = prim.defaultOf;
    const newInstanceData = {
      name: name,
      of: of,
      kind: kind,
      loc: this.uiState.mouse_pos,
      orientation: structuredClone(lastInstanceData.orientation),
    };
    this.uiState.lastInstanceData = newInstanceData;
    const newInstance = new Instance(newInstanceData);
    return newInstance;
  }
  // Start adding a new Instance
  startAddInstance = () => {
    // Create the provisional `Instance`. Note it is *not* added to the schematic yet.
    const instance = this.createInstance();
    if (!instance) {
      return;
    }

    // Update our UI state.
    this.uiState.mode = UiModes.AddInstance;
    const entity = new Entity(EntityKind.Instance, instance);
    this.select(entity);
    this.uiState.pending_entity = entity;

    // And draw the instance.
    instance.draw();
  };
  changeInstanceKind = (e: KeyboardEvent) => {
    const prim = PrimitiveKeyboardShortcuts.get(e.key);
    if (!prim) {
      return;
    }

    // We hit a primitive shortcut key and have a valid new type
    const instance = this.selected_object();
    instance.data.kind = prim.kind;

    instance.data.name = prim.defaultNamePrefix;
    instance.data.of = prim.defaultOf;
    this.uiState.lastInstanceData = instance.data;
    instance.draw();
  };
  // Update the rendering of an in-progress instance.
  updateAddInstance = () => {
    const instance = this.selected_object();
    // Snap to our grid
    const snapped = nearestOnGrid(this.uiState.mouse_pos);
    // Set the location of both the instance and its drawing
    instance.data.loc = snapped;
    instance.draw();
  };
  // Update the rendering of an in-progress instance move.
  updateMove = () => {
    if (
      !this.uiState.pendingChange ||
      this.uiState.pendingChange.kind != ChangeKind.Move
    ) {
      return this.failer("updateMove: no Pending Move Change");
    }
    const instance = this.selected_object();
    // Snap to our grid
    const snapped = nearestOnGrid(this.uiState.mouse_pos);
    // Set the location of both the instance and its drawing
    instance.data.loc = snapped;
    instance.draw();

    // Update the coordinate in our pending change-log entry.
    this.uiState.pendingChange.to.loc = structuredClone(snapped);
  };
  // Add the currently-pending instance to the schematic.
  commitAddInstance = () => {
    const instance = this.selected_object();
    this.schematic.addInstance(instance);

    // Notify the changeLog and platform of the change.
    const entity = this.uiState.selected_entity;
    this.logChange({ kind: ChangeKind.Add, entity });

    this.uiState.pending_entity = null;
    this.deselect();
    this.goUiIdle();
  };
  // "Commit" a move by placing it in the change log.
  // Actual moves and re-draws are performed "live" as the mouse moves.
  commitMove = () => {
    // Notify the changeLog and platform of the change.
    if (!this.uiState.pendingChange) {
      return this.failer("commitMove: no pending change");
    }
    this.logChange(this.uiState.pendingChange);
    this.uiState.pendingChange = null;
    this.uiState.pending_entity = null;
    this.goUiIdle();
  };
  // Create a new Port
  createPort(): SchPort | void {
    // Create the provisional `Port`.
    // Use the last one added as a template.
    const { lastPortData } = this.uiState;
    const { kind } = lastPortData;
    const portsym = PortMap.get(kind);
    if (!portsym) {
      return this.failer(`createPort: unknown port kind: ${kind}`);
    }

    const newPortData = {
      name: portsym.defaultName,
      kind: kind,
      loc: this.uiState.mouse_pos,
      orientation: structuredClone(lastPortData.orientation),
    };
    this.uiState.lastPortData = newPortData;
    const newPort = new SchPort(newPortData);
    return newPort;
  }
  // Start adding a new Port
  startAddPort = () => {
    // Create the provisional `Port`. Note it is *not* added to the schematic yet.
    const port = this.createPort();
    if (!port) {
      return;
    }

    // Update our UI state.
    this.uiState.mode = UiModes.AddPort;
    const entity = new Entity(EntityKind.SchPort, port);
    this.select(entity);
    this.uiState.pending_entity = entity;

    // And draw the port.
    port.draw();
  };
  changePortKind = (e: KeyboardEvent) => {
    const portsym = PortKeyboardShortcuts.get(e.key);
    if (!portsym) {
      return;
    }

    // We hit a portsymitive shortcut key and have a valid new type
    const port = this.selected_object();
    port.data.kind = portsym.kind;
    port.data.name = portsym.defaultName;
    this.uiState.lastPortData = port.data;
    port.draw();
  };
  // Update the rendering of an in-progress port.
  updateAddPort = () => {
    const port = this.selected_object();
    // Snap to our grid
    const snapped = nearestOnGrid(this.uiState.mouse_pos);
    // Set the location of both the port and its drawing
    port.data.loc = snapped;
    port.draw();
  };
  // Update the rendering of an in-progress port move.
  updateMovePort = () => {
    const port = this.selected_object();
    // Snap to our grid
    const snapped = nearestOnGrid(this.uiState.mouse_pos);
    // Set the location of both the port and its drawing
    port.data.loc = snapped;
    port.draw();

    // Notify the platform that the schematic has changed.
    this.sendChangeMessage();
  };
  // Add the currently-pending port to the schematic.
  commitAddPort = () => {
    const port = this.selected_object();
    this.schematic.addPort(port);

    // Notify the changeLog and platform of the change.
    const entity = this.uiState.selected_entity;
    this.uiState.changeLog.add({ kind: ChangeKind.Add, entity });

    this.uiState.pending_entity = null;
    this.deselect();
    this.goUiIdle();
  };
  // Add or remove a character from a `Label`.
  // Text editing is thus far pretty primitive.
  // The "cursor" is always implicitly at the end of each Label.
  // Backspace removes the last character, and we do what we can to filter down to characters
  // which can be added to Labels - i.e. not "PageDown", "DownArrow" and the like.
  updateEditLabel = (e: KeyboardEvent) => {
    if (e.key === Keys.Enter) {
      // Done editing. Commit the label.
      this.deselect();
      return this.goUiIdle();
    }
    // Get the active Label
    const label = this.selected_object();
    let text = label.text;

    if (e.key === Keys.Backspace) {
      // Subtract last character of the label
      return label.update(text.slice(0, text.length - 1));
    }
    // Filter down to "identifier characters": letters, numbers, and underscores.
    if (e.key.length !== 1 || e.key === Keys.Space) {
      return;
    }

    // Notify the platform that the schematic has changed.
    this.sendChangeMessage();

    // Add the character to the label.
    return label.update(text + e.key);
  };
  commitEditLabel = () => {
    this.failer("FIXME! commitEditLabel: not implemented");
  };
  // Flip the selected instance, if one is selected.
  flipSelected = (dir: Direction) => {
    if (!this.uiState.selected_entity) {
      return;
    }
    const { kind } = this.uiState.selected_entity;
    if (!(kind === EntityKind.Instance || kind === EntityKind.SchPort)) {
      return;
    }

    // We have a flippable selected entity. Flip it.
    const obj = this.selected_object();
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
    const { kind } = this.uiState.selected_entity;
    if (!(kind === EntityKind.Instance || kind === EntityKind.SchPort)) {
      return;
    }

    // We have a selected Instance. Rotate it.
    const obj = this.selected_object();
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

// The singleton `SchEditor`, and our entrypoint to start it up.
let theEditor: SchEditor | null = null;
export function start(platform: Platform): void {
  if (theEditor) {
    return;
  }
  theEditor = new SchEditor(platform);
}
