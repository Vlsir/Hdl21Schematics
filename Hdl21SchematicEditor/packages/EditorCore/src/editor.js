/*
 * # Hdl21 Schematics Editor
 * 
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic. 
 */

import Two from "two.js";

// Local Imports 
import { Point } from "./point";
import { PrimitiveMap, PrimitiveKind } from "./primitive";
import { Importer } from "./importer";
import { Exporter } from "./exporter";
import { nextRotation } from "./schematic";
import { EntityKind } from "./entity";
import { Entity, Schematic, Instance, Wire } from "./drawing";
import { gridLineStyle } from "./style";
import { UiState, UiModes } from "./uistate";
import { theCanvas } from "./canvas";

// Given a `Point`, return the nearest grid point.
const nearestOnGrid = loc /* Point */ => /* Point */ {
    const grid_size = 10;
    return new Point(
        Math.round(loc.x / grid_size) * grid_size,
        Math.round(loc.y / grid_size) * grid_size
    );
};

// Find the nearest Manhattan-separated point on the grid relative to `relativeTo`.
const nearestManhattan = (loc, relativeTo) => {
    const dx = relativeTo.x - loc.x;
    const dy = relativeTo.y - loc.y;

    var landing1;
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal segment 
        landing1 = new Point(loc.x, relativeTo.y);
    } else {
        // Vertical segment 
        landing1 = new Point(relativeTo.x, loc.y);
    }
    return nearestOnGrid(landing1);
}

// # Keyboard Inputs 
// (That we care about)
const Keys = Object.freeze({
    i: "i", // Instance
    w: "w", // Wire
    r: "r", // Rotate 
    h: "h", // Horizontal flip
    v: "v", // Vertical flip
    Comma: ",", // Save(?)
    Escape: "Escape", // Cancel
    Backspace: "Backspace", // Delete
    Delete: "Delete", // Delete
    Enter: "Enter", // Finish
    Space: " ", // Filter this out of names
});

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
    constructor(platform) {
        // Initialize the editor state 
        this.platform = platform;
        this.schematic = null;
        this.uiState = new UiState();
        // Eventually make this a more general error-handling function. For now, log it. 
        this.failer = console.log;

        // Perform all of our one-time startup activity, binding events, etc.

        // window.addEventListener('resize', e => console.log(e));
        window.addEventListener("wheel", this.handleWheel);
        window.addEventListener("keydown", this.handleKey);
        window.addEventListener('mousedown', this.handleMouseDown, true);
        window.addEventListener('mouseup', this.handleMouseUp, true);
        window.addEventListener('mousemove', this.handleMouseMove, true);
        window.addEventListener("dblclick", this.handleDoubleClick);
        // window.addEventListener("click", this.handleClick);

        // Register our message-handler with the platform.
        this.platform.registerMessageHandler(this.handleMessage);

        // Send a message back to the main process, to indicate this has all run. 
        this.platform.sendMessage({ kind: "renderer-up" });
    }
    // Send the schematic's SVG content to the platform for saving. 
    sendSaveFile = () => {
        const schData = this.schematic.toData();
        const svgContent = Exporter.export(schData);
        return this.platform.sendMessage({ kind: "save-file", body: svgContent });
    }
    // Send a schematic-changed message back to the platform.
    sendChangeMessage = () => {
        return this.platform.sendMessage({ kind: "change" });
    }
    // Handle incoming Messages from the platform.
    handleMessage = msg => {
        switch (msg.kind) {
            case 'new-schematic': return this.newSchematic();
            case 'load-file': {
                // Load schematic content from the file.
                const schData = Importer.import(msg.body);
                const schematic = Schematic.fromData(schData);
                // FIXME: error handling here
                return this.loadSchematic(schematic);
            }
            // Messages designed to sent *from* us, to the platform.
            case 'change': {
                return this.failer(`Invalid message from platform to editor: ${msg}`);
            }
            default: {
                return this.failer(`Unknown message type: ${msg}`);
            }
        }
    }
    // Load a new and empty schematic into the editor.
    newSchematic = () => {
        this.loadSchematic(new Schematic());
    }
    // Load `schematic` into the UI and draw it.
    loadSchematic = schematic => {
        this.schematic = schematic;

        // Clear the drawing window, in case we have a previous drawing.
        theCanvas.clear();

        // Set up the background grid
        this.setupGrid();

        // And draw the loaded schematic
        this.schematic.draw();
    }
    // Set up the background grid
    setupGrid = () => {
        // Get the outline size from the Schematic
        const x = this.schematic.size.x;
        const y = this.schematic.size.y;

        for (let i = 0; i <= x; i += 10) {
            const line = new Two.Line(i, 0, i, y);
            theCanvas.gridLayer.add(line);
            gridLineStyle(line, i % 100 == 0);
        }
        for (let i = 0; i <= y; i += 10) {
            const line = new Two.Line(0, i, x, i);
            theCanvas.gridLayer.add(line);
            gridLineStyle(line, i % 100 == 0);
        }
    }
    // Go to the "UI Idle" state, in which nothing is moving, being drawn, or really doing anything. 
    goUiIdle = () => {
        this.uiState.mode = UiModes.Idle;
    }
    // Handle zoom via the mouse scroll wheel. 
    handleWheel = (e) => {
        // FIXME: not quite ready.
        // const dy = (e.wheelDeltaY || - e.deltaY) / 1000;
        // theCanvas.zui.zoomBy(dy, e.clientX, e.clientY);
    }
    // Handle keystrokes. 
    handleKey = (e) => {
        // Always go back to idle mode on escape.
        if (e.key === Keys.Escape) {
            this.deselect();
            return this.goUiIdle();
        }
        // In the update Text Labels state, forward all other keystrokes to its handler. 
        if (this.uiState.mode === UiModes.EditLabel) {
            return this.updateEditLabel(e);
        }
        // All other UI states: check for "command" keystrokes.
        switch (e.key) {
            case Keys.Delete:
            case Keys.Backspace: {
                // Delete the selected entity
                return this.deleteSelectedEntity();
            }
            // FIXME: if already in these states, we start a new entity without *really* finishing the pending one!
            case Keys.i: return this.startAddInstance();
            case Keys.w: return this.startDrawWire();
            // Rotation & refelection
            case Keys.r: return this.rotateSelected();
            case Keys.v: return this.flipSelected(Direction.Vert);
            case Keys.h: return this.flipSelected(Direction.Horiz);
            // Save with... comma(?). FIXME: modifier keys plz!
            case Keys.Comma: return this.sendSaveFile();
            default: console.log(`Key we dont use: '${e.key}'`);
        }
    }
    // Delete the selected entity, if we have one, and it is deletable.
    deleteSelectedEntity = () => {
        if (!this.uiState.selected_entity) { return; }
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
                return this.goUiIdle();
            }
            // Non-delete-able "child" entities
            case EntityKind.Label:
            case EntityKind.InstancePort:
                return;
        }
    }
    // Hit test all schematic entities. 
    // Returns the "highest priority" entity that is hit, or `null` if none are hit.
    whatdWeHit = point => { /* Entity | null */
        // Check all Instance Labels
        for (let [key, instance] of this.schematic.instances) {
            for (let label of instance.labels()) {
                if (label.hitTest(point)) {
                    return new Entity({ kind: EntityKind.Label, obj: label });
                }
            }
        }
        // Check all Port Labels
        for (let [key, port] of this.schematic.ports) {
            for (let label of port.labels()) {
                if (label.hitTest(point)) {
                    return new Entity({ kind: EntityKind.Label, obj: label });
                }
            }
        }
        // Check all Instance symbols / bodies
        for (let [key, instance] of this.schematic.instances) {
            if (instance.hitTest(point)) {
                return new Entity({ kind: EntityKind.Instance, obj: instance });
            }
        }
        // Check all Port symbols / bodies
        for (let [key, port] of this.schematic.ports) {
            if (port.hitTest(point)) {
                return new Entity({ kind: EntityKind.SchPort, obj: port });
            }
        }
        // Check all Wires
        for (let [key, wire] of this.schematic.wires) {
            if (wire.hitTest(point)) {
                return new Entity({ kind: EntityKind.Wire, obj: wire });
            }
        }
        // Didn't hit anything, return null.
        return null;
    }
    // Get the inner `obj` field from our selected entity, if we have one.
    selected_object = () => {
        if (!this.uiState.selected_entity) { return null; }
        return this.uiState.selected_entity.obj;
    }
    // Make `entity` the selected, highlighted entity.
    select = entity => {
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
    }
    handleMouseDown = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

        // And react to the current UI mode.
        switch (this.uiState.mode) {
            case UiModes.Idle: {
                // In idle mode, if we clicked on something, react and update our UI state.
                if (!whatd_we_hit) {
                    // Hit "blank space". Start panning the UI. 
                    this.deselect();
                    return this.goUiIdle();
                    // this.uiState.mode = UiModes.Pan;
                    // this.uiState.start_mouse_pos = this.uiState.mouse_pos;
                    // return;
                }
                // Select the clicked-on entity

                // And react based on its type. 
                switch (whatd_we_hit.kind) {
                    case EntityKind.SchPort:
                    case EntityKind.Instance: { // Start moving the instance.
                        this.uiState.mode = UiModes.MoveInstance;
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
                        return this.failer(`Unknown entity kind: ${whatd_we_hit.kind} in handleMouseDown`);
                    }
                }
                break;
            }
            case UiModes.AddInstance: return this.commitInstance();
            // case UiModes.DrawWire: return this.addWireVertex(); // Do this on mouse-up
            default: break;
        }
    }
    handleMouseUp = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

        // And react to the current UI mode.
        switch (this.uiState.mode) {
            case UiModes.DrawWire: return this.addWireVertex();
            case UiModes.AddInstance: return this.commitInstance();
            case UiModes.MoveInstance:// Done moving, go back to idle mode.
                return this.goUiIdle();
            case UiModes.EditLabel:
                return console.log("DAMMIT!!!!");
            case UiModes.Pan:
                return console.log("HOW WE GET HERE");
            default:
                return console.log("WE REALLY NEED THAT EXHAUSTIVE ENUM!!!");
        }
    }
    // // Handle mouse click events.
    // handleClick = e => {
    // }
    // Handle double-click events.
    handleDoubleClick = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.uiState.mouse_pos);

        // And react to the current UI mode.
        switch (this.uiState.mode) {
            case UiModes.DrawWire: this.commitWire(); break;
            default: break;
        }
    }
    // Handle mouse movement events.
    handleMouseMove = e => {
        // Update our tracking of the mouse position.
        const oldMouse = this.uiState.mouse_pos.copy();
        this.uiState.mouse_pos = theCanvas.screenToCanvas(new Point(e.clientX, e.clientY));

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
            case UiModes.DrawWire: this.updateDrawWire(); break;
            case UiModes.AddInstance: this.updateAddInstance(); break;
            case UiModes.MoveInstance: this.updateMoveInstance(); break;
            default: break;
        }
    }
    // Enter the `DrawWire` mode, and create the tentative Wire. 
    startDrawWire = () => {
        this.uiState.mode = UiModes.DrawWire;
        const start = nearestOnGrid(this.uiState.mouse_pos);
        const wire = new Wire([start, start.copy()]);
        wire.draw();
        this.select(new Entity({ kind: EntityKind.Wire, obj: wire }));
    }
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
    }
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
        points.push(landing.copy());

        // Update the wire and redraw it.
        wire.points = points;
        wire.draw();;
    }
    // Commit the currently-drawn wire to the schematic.
    // Removes it from `selected_entity` and adds it to the schematic.
    commitWire = () => {
        // Add the wire to the schematic.
        const wire = this.selected_object();
        this.schematic.addWire(wire);

        // And go back to the UI Idle, nothing selected state.
        this.deselect();
        this.goUiIdle();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();

        // FIXME: this will probably want some more computing at commit-time, 
        // figuring out hit-test areas, etc. 
    }
    // Create a new Instance
    createInstance = () => {
        // Create the provisional `Instance`.
        // Use the last one added as a template.
        const { lastInstanceData } = this.uiState;
        const { kind } = lastInstanceData;
        const prim = PrimitiveMap.get(kind) || PrimitiveKind.Nmos;

        // FIXME: switch these based on `kind`
        const name = `${prim.defaultNamePrefix}${this.schematic.num_instances}`;
        const of = prim.defaultOf;
        const newInstanceData = {
            name: name,
            of: of,
            kind: kind,
            loc: this.uiState.mouse_pos,
            orientation: lastInstanceData.orientation.copy(),
        };
        this.uiState.lastInstanceData = newInstanceData;
        const newInstance = new Instance(newInstanceData);
        return newInstance;
    }
    // Start adding a new Instance
    startAddInstance = () => {
        // Create the provisional `Instance`. Note it is *not* added to the schematic yet.
        const instance = this.createInstance();

        // Update our UI state.
        this.uiState.mode = UiModes.AddInstance;
        this.select(new Entity({ kind: EntityKind.Instance, obj: instance }));

        // And draw the instance.
        instance.draw();
    }
    changeInstanceKind = () => {
        console.log("FIXME! changeInstanceKind");
    }
    // Update the rendering of an in-progress instance.
    updateAddInstance = () => {
        const instance = this.selected_object();
        // Snap to our grid
        const snapped = nearestOnGrid(this.uiState.mouse_pos);
        // Set the location of both the instance and its drawing 
        instance.data.loc = snapped;
        instance.draw();
    }
    // Update the rendering of an in-progress instance move.
    updateMoveInstance = () => {
        const instance = this.selected_object();
        // Snap to our grid
        const snapped = nearestOnGrid(this.uiState.mouse_pos);
        // Set the location of both the instance and its drawing 
        instance.data.loc = snapped;
        instance.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
    // Add the currently-pending instance to the schematic.
    commitInstance = () => {
        const instance = this.selected_object();
        this.schematic.addInstance(instance);
        this.deselect();
        this.goUiIdle();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
    // Add or remove a character from a `Label`. 
    // Text editing is thus far pretty primitive. 
    // The "cursor" is always implicitly at the end of each Label. 
    // Backspace removes the last character, and we do what we can to filter down to characters
    // which can be added to Labels - i.e. not "PageDown", "DownArrow" and the like. 
    updateEditLabel = e => {
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
    }
    // Flip the selected instance, if one is selected.
    flipSelected = dir => {
        if (!this.uiState.selected_entity) { return; }
        const { kind } = this.uiState.selected_entity;
        if (!(kind === EntityKind.Instance || kind === EntityKind.SchPort)) { return; }

        // We have a flippable selected entity. Flip it. 
        const obj = this.selected_object();

        // Always flip vertically. Horizontal flips are comprised of a vertical flip and two rotations.
        obj.data.orientation.reflected = !obj.data.orientation.reflected;
        if (dir === Direction.Horiz) {
            obj.data.orientation.rotation = nextRotation(nextRotation(obj.data.orientation.rotation));
        }
        obj.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
    // Rotate the selected entity by 90 degrees, if one is selected.
    rotateSelected = () => {
        if (!this.uiState.selected_entity) { return; }
        const { kind } = this.uiState.selected_entity;
        if (!(kind === EntityKind.Instance || kind === EntityKind.SchPort)) { return; }

        // We have a selected Instance. Rotate it. 
        const obj = this.selected_object();
        obj.data.orientation.rotation = nextRotation(obj.data.orientation.rotation);
        obj.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
}


// The singleton `SchEditor`, and our entrypoint to start it up.
let theEditor = null;
export function start(platform) { /* Platform => void */
    if (theEditor) { return; }
    theEditor = new SchEditor(platform);
}
