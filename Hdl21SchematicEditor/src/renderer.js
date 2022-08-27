/**
 * # Hdl21 Schematics Renderer
 * 
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic. 
 */

import { parse as svgparse } from 'svg-parser';
import Two from 'two.js';
import './index.css';


// The platform "abstraction". 
// Eventually this will be a module and layer over Electron, VsCode, and however the browser is implemented.
// For now its just a reference to the `window.electronAPI` object.
const THE_PLATFORM = window.electronAPI;


// The schematic SVG / CSS style classes. 
const schematicStyle = `
<style>
/* Styling for Symbol and Wire Elements */
.hdl21-symbols {
  fill: none;
  stroke: black;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 10px;
  stroke-dashoffset: 0px;
}

.hdl21-instance-port {
  fill: white;
  stroke: black;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4px;
  stroke-dashoffset: 0px;
}

.hdl21-dot {
  fill: purple;
  stroke: purple;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4px;
  stroke-dashoffset: 0px;
}

.hdl21-wire {
  fill: none;
  stroke: blue;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 10px;
  stroke-dashoffset: 0px;
}

/* Styling for Text Labels */
.hdl21-labels,
.hdl21-instance-name,
.hdl21-instance-of,
.hdl21-wire-name {
  fill: black;
  font-family: comic sans ms;
  /* We know, it's just too funny */
  font-size: 16px;
}
</style>
`;


// Global stuff, at least for now 
// The Two.js "draw-er", canvas, whatever they call it. 
const two = new Two({
    // Lotta futzing with these options has found these two to be indispensible. 
    fullscreen: true,
    autostart: true,
    // Perhaps some day we can better understand what goes on with the others. 
    // Particularly when implementing resizing.
    // 
    // fitted: true,
    // width: window.innerWidth,
    // height: window.innerHeight,
    // width: 1600,
    // height: 800,
}).appendTo(document.body);


// # Point
// Two-dimensional point in schematic-UI space. 
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new Point(this.x, this.y);
    }
}

// # Primitive Enumeration 
// 
// The list of enumerated primitives element types. 
// Serves as the keys in the `PrimitiveMap` mapping, 
// and the key stored on each `Instance` object.
// 
const PrimitiveEnum = Object.freeze({
    Nmos: Symbol("Nmos"),
    Pmos: Symbol("Pmos"),
    Input: Symbol("Input"),
    Output: Symbol("Output"),
    Inout: Symbol("Inout"),
    Vsource2: Symbol("Vsource2"),
    Vsource4: Symbol("Vsource4"),
    Isource2: Symbol("Isource2"),
    Isource4: Symbol("Isource4"),
    Res2: Symbol("Res2"),
    Res3: Symbol("Res3"),
    Cap2: Symbol("Cap2"),
    Cap3: Symbol("Cap3"),
    Ind2: Symbol("Ind2"),
    Ind3: Symbol("Ind3"),
    Diode: Symbol("Diode"),
    Diode3: Symbol("Diode3"),
    Npn: Symbol("Npn"),
    Pnp: Symbol("Pnp"),
});


// # Primitive Instance Port
class Port {
    constructor(args) {
        this.name = args.name; // string
        this.loc = args.loc;   // Point
    }
}

// # Primitive Element
// 
// The types of things which schematics can instantiate.
// Primitives include the symbol drawing as an SVG string, 
// plus metadata indicating their port names and locations.
// 
class Primitive {
    constructor(args) {
        this.enumval = args.enumval; // PrimitiveEnum
        this.svgStr = args.svgStr;   // SVG-valued string
        this.ports = args.ports;     // [Port]
        this.nameloc = args.nameloc; // Point
        this.ofloc = args.ofloc;     // Point
    }
    // Create a new Primitive, and add it to the `PrimitiveMap` mapping.
    static add(args) {
        PrimitiveMap.set(args.enumval, new Primitive(args));
    }
}
// Map from enumerated keys to `Primitive` objects.
const PrimitiveMap = new Map();

Primitive.add({
    enumval: PrimitiveEnum.Nmos,
    svgStr: `
    <g class="hdl21::primitives::nmos">
        <path d="M 0 0 L 0 20 L 28 20 L 28 60 L 0 60 L 0 80" class="hdl21-symbols" />
        <path d="M 40 20 L 40 60" class="hdl21-symbols" />
        <path d="M -5 60 L 10 50 L 10 70 Z" class="hdl21-symbols" />
        <path d="M 0 40 L -20 40" class="hdl21-symbols" />
        <path d="M 40 40 L 70 40" class="hdl21-symbols" />
        <circle cx="0" cy="0" r="4" class="hdl21-instance-port" />
        <circle cx="-20" cy="40" r="4" class="hdl21-instance-port" />
        <circle cx="70" cy="40" r="4" class="hdl21-instance-port" />
        <circle cx="0" cy="80" r="4" class="hdl21-instance-port" />
        <!-- <circle cx="-20" cy="40" r="4" class="hdl21-dot" /> -->
    </g>
    `,
    ports: [
        new Port({ name: "d", loc: new Point(0, 0) }),
        new Port({ name: "g", loc: new Point(10, 0) }), // FIXME!
        new Port({ name: "s", loc: new Point(10, 10) }), // FIXME!
        new Port({ name: "b", loc: new Point(0, 10) }), // FIXME!
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
});
Primitive.add({
    enumval: PrimitiveEnum.Pmos,
    svgStr: `
    <g class="hdl21::primitives::pmos">
        <path d="M 0 0 L 0 20 L 28 20 L 28 60 L 0 60 L 0 80" class="hdl21-symbols" />
        <path d="M 40 20 L 40 60" class="hdl21-symbols" />
        <path d="M 30 20 L 15 10 L 15 30 Z" class="hdl21-symbols" />
        <path d="M 0 40 L -20 40" class="hdl21-symbols" />
        <path d="M 70 40 L 60 40" class="hdl21-symbols" />
        <circle cx="50" cy="40" r="8" fill="white" class="hdl21-symbols" />
        <circle cx="0" cy="0" r="4" class="hdl21-instance-port" />
        <circle cx="-20" cy="40" r="4" class="hdl21-instance-port" />
        <circle cx="70" cy="40" r="4" class="hdl21-instance-port" />
        <circle cx="0" cy="80" r="4" class="hdl21-instance-port" />
    </g>
    `,
    ports: [
        new Port({ name: "d", loc: new Point(0, 0) }),
        new Port({ name: "g", loc: new Point(10, 0) }), // FIXME!
        new Port({ name: "s", loc: new Point(10, 10) }), // FIXME!
        new Port({ name: "b", loc: new Point(0, 10) }), // FIXME!
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
});
// FIXME: add all the other elements


// # Schematic Entity 
// 
// All the methods for interacting with a schematic entity.
// "Implementers" include Symbols, Ports, and WireSegments.
// 
// This isn't a class that we instantiate, so much as a "reminder" of the interface to one. 
// If this language had traits, this would be a trait.
// Maybe there's something better to represent it in this language some day; 
// if we find one, it'll become that. 
// 
class Entity {

    // Update styling to indicate highlighted-ness
    highlight = () => { }
    // Update styling to indicate the lack of highlighted-ness
    unhighlight = () => { }
    // Boolean indication of whether `point` is inside the instance.
    hitTest = point => { }
    // Abort an in-progress instance.
    abort = () => { }

    // FIXME: whether to include drawing
    // Create and add the drawn, graphical representation
    // draw = () => { }

}


// # Schematic Instance 
// 
// Combination of the Instance data and drawn visualization. 
// 
class Instance {
    constructor(args) {
        // Instance Data
        this.name = args.name; // string
        this.of = args.of;// string
        this.kind = args.kind;// PrimitiveEnum
        this.loc = args.loc;//Point
        this.orientation = args.orientation;// Orientation

        // Drawing data, set during calls to `draw()`.
        // The two.js drawing, implemented as a Two.Group.
        this.drawing = null;
        // The bounding box for hit testing. 
        this.bbox = null;
    }
    highlight = () => {
        if (!this.drawing) {
            return;
        }
        for (let child of this.drawing.children) {
            child.stroke = 'rgb(150, 100, 255)';
        }
    }
    unhighlight = () => {
        if (!this.drawing) {
            return;
        }
        for (let child of this.drawing.children) {
            child.stroke = 'rgb(0,0,0)';
        }
    }
    // Create and draw the Instance's `drawing`. 
    draw = () => {
        const primitive = PrimitiveMap.get(this.kind);
        if (!primitive) {
            throw new Error(`No primitive for kind ${this.kind}`);
        }

        // Load the symbol as a Two.Group. 
        // Note we apply the styling and wrap the content in <svg> elements.
        const symbol = two.load(schematicStyle + "<svg>" + primitive.svgStr + "</svg>");
        two.add(symbol);

        // symbol.stroke = 'rgb(0, 0, 0)';
        this.bbox = symbol.getBoundingClientRect();

        // Create the Instance's drawing-Group, including its symbol, names, and ports.
        const instanceGroup = two.makeGroup();
        instanceGroup.add(symbol);
        instanceGroup.translation.set(this.loc.x, this.loc.y);

        // Closure to create styled text.
        const makeText = text => {
            const textElem = two.makeText(text);
            textElem.alignment = 'left';
            textElem.family = 'Comic Sans MS';
            textElem.style = 'heavy';
            textElem.size = 16;
            return textElem;
        }

        // Create and add the instance-name text object 
        const instanceName = makeText(this.name);
        instanceName.translation.set(primitive.nameloc.x, primitive.nameloc.y);
        instanceGroup.add(instanceName);

        // Create and add the instance-name text object 
        const instanceOf = makeText(this.of);
        instanceOf.translation.set(primitive.ofloc.x, primitive.ofloc.y);
        instanceGroup.add(instanceOf);

        var dragging = false;
        var mouse = new Two.Vector();


        function mousedown(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            dragging = true;
            this.bbox = symbol.getBoundingClientRect();
            const rect = this.bbox;
            console.log(rect);
            // var rect = symbol.getBoundingClientRect();
            dragging = mouse.x > rect.left && mouse.x < rect.right
                && mouse.y > rect.top && mouse.y < rect.bottom;

            window.addEventListener('mousemove', mousemove, false);
            window.addEventListener('mouseup', mouseup, false);
        }

        const mousemove = (e) => {
            this.bbox = symbol.getBoundingClientRect();
            var dx = e.clientX - mouse.x;
            var dy = e.clientY - mouse.y;
            if (dragging) {
                // Snap to our grid
                const snapped = nearestOnGrid(the_editor.ui_state.mouse_pos); // FIXME: move this!
                // Set the location of both the instance and its drawing 
                instanceGroup.translation.set(snapped.x, snapped.y);
                this.loc = snapped;
            } else {
                zui.translateSurface(dx, dy);
            }
            mouse.set(e.clientX, e.clientY);
        }

        function mouseup(e) {
            window.removeEventListener('mousemove', mousemove, false);
            window.removeEventListener('mouseup', mouseup, false);
        }

        // FIXME: move this to a central hit tester! 
        // Update the renderer in order to generate
        // the SVG DOM Elements. Then bind the events
        // to those elements directly.
        two.update();
        symbol._renderer.elem.addEventListener('mousedown', mousedown, false);
        this.drawing = instanceGroup;

    }
    // Boolean indication of whether `point` is inside the Instance's bounding box.
    hitTest = point => {
        if (!this.bbox) {
            return false;
        }
        const bbox = this.bbox;
        return point.x > bbox.left && point.x < bbox.right
            && point.y > bbox.top && point.y < bbox.bottom;

    }
    // Abort drawing an in-progress instance.
    abort = () => {
        // FIXME! 
        // two.remove(this.drawing);
    }
}
class Wire {
    constructor(points /* Point[] */) {
        this.points = points;
        this.drawing = null; /* Two.Path, set by `draw()` */
    }
    // Create from a list of `Point`s. Primarily creates the drawn `Path`. 
    draw = () => {
        // Flatten coordinates into the form [x1, y1, x2, y2, ...]
        let coords = [];
        for (let point of this.points) {
            coords.push(point.x, point.y);
        }
        // Create the drawing 
        const drawing = two.makePath(...coords);

        // Set the wire style 
        drawing.visible = true;
        drawing.closed = false;
        drawing.noFill();
        drawing.stroke = 'blue';
        drawing.linewidth = 10;
        drawing.cap = 'round';
        drawing.join = 'round';

        this.drawing = drawing;
        two.update();
    }
    // Abort drawing an in-progress wire.
    abort = () => {
        two.remove(this.drawing);
    }
    // Update styling to indicate highlighted-ness
    highlight = () => { }
    // Update styling to indicate the lack of highlighted-ness
    unhighlight = () => { }
    // Boolean indication of whether `point` is inside the instance.
    hitTest = point => { return false; }
}
class Schematic {
    constructor(size) {
        this.size = size || new Point(1600, 800);
        this.instances = [];
        this.wires = [];
    }
    // Draw all elements in the schematic.
    draw = () => {
        for (let instance of this.instances) {
            instance.draw();
        }
        for (let wire of this.wires) {
            wire.draw();
        }
    }
}


/// # Enumerated UI Modes 
/// 
const UiModes = Object.freeze({
    Idle: Symbol("Idle"),
    AddInstance: Symbol("AddInstance"),
    DrawWire: Symbol("DrawWire"),
});

// Enumerate Update Types 
// Stored in the playback queue, e.g. for undo/redo. 
const UpdateTypes = Object.freeze({
    AddInstance: Symbol("AddInstance"),
    RemoveInstance: Symbol("RemoveInstance"),
    RemoveGroup: Symbol("RemoveGroup"),
    AddWire: Symbol("AddWire"),
    RemoveWire: Symbol("RemoveWire"),
});

// # UI State 
// 
// Everything about the current state of the UI that *is not* the content of the schematic. 
// 
class UiState {
    constructor() {
        // Global UI mode 
        this.mode = UiModes.Idle;
        // Change-log, for undo-redo
        this.changes = [];
        // Running count of added instances, for naming. 
        this.num_instances = 0;
        // The currently selected entity (instance, wire, port, etc.)
        this.selected_entity = null;
        // Track the mouse position at all times. 
        // Initializes to the center of the `two` canvas.
        this.mouse_pos = new Two.Vector(two.width / 2, two.height / 2);
    }
}

// Given a `Point`, return the nearest grid point.
const nearestOnGrid = loc /* Point */ => /* Point */ {
    const grid_size = 10;
    return new Point(
        Math.round(loc.x / grid_size) * grid_size,
        Math.round(loc.y / grid_size) * grid_size
    );
};

// # Keyboard Inputs 
// (That we care about)
const Keys = Object.freeze({
    i: "i",
    w: "w",
    Comma: ",",
    Escape: "Escape",
});

// # The Schematic Editor UI 
// 
// The "top-level" singleton type for the schematic editor UI, 
// including all UI state and the contents of the schematic. 
// Includes essentially all behavior of the schematic editor; 
// core attributes `schematic` and `ui_state` are largely "data only". 
// 
class SchEditor {
    constructor(schematic, ui_state) {
        this.schematic = schematic;
        this.ui_state = ui_state;
    }
    // Perform all of our one-time startup activity, binding events, etc.
    startup = () => {
        // Bind UI events
        window.addEventListener('resize', e => console.log(e));
        window.addEventListener("keydown", this.handleKey);
        window.addEventListener('mousedown', this.handleMouseDown, true);
        window.addEventListener('mouseup', this.handleMouseUp, true);
        window.addEventListener('mousemove', this.handleMouseMove, true);
        window.addEventListener("click", this.handleClick);
        window.addEventListener("dblclick", this.handleDoubleClick);
    }
    loadSchematic = schematic => {
        this.schematic = schematic;

        // Clear the drawing window, in case we have a previous drawing.
        two.clear();

        // Set up the background grid
        this.setupGrid();

        // And draw the loaded schematic
        this.schematic.draw();
    }
    // Set up the background grid
    setupGrid = () => {
        // FIXME: get outline from the schematic somehow
        const x = 1600;
        const y = 800;

        // Closure to add grid-line styling
        const styleLine = (line, isMajor) => {
            line.stroke = 'grey';
            line.visible = true;
            line.closed = false;
            line.noFill();
            if (isMajor) {
                line.linewidth = 1;
            } else {
                line.linewidth = 0.5;
            }
        };
        for (let i = 0; i <= x; i += 10) {
            const line = two.makeLine(i, 0, i, y);
            styleLine(line, i % 100 == 0);
        }
        for (let i = 0; i <= y; i += 10) {
            const line = two.makeLine(0, i, x, i);
            styleLine(line, i % 100 == 0);
        }
    }
    handleKey = (e) => {
        switch (e.key) {
            case Keys.Escape: {
                // Revert to the idle state. Drop the selected entity.
                // FIXME: if it has a drawn component, abort drawing/ adding it.
                this.ui_state.mode = UiModes.Idle;
                this.ui_state.selected_entity = null;
                break;
            }
            case Keys.i: this.addInstance(); break;
            case Keys.w: this.startDrawWire(); break;
            case Keys.Comma: THE_PLATFORM.sendSaveFile(serialize(this.schematic)); break;
            default: console.log(`Key we dont use: ${e.key}`); break;
        }
    }
    whatdWeHit = point => {
        for (let instance of this.schematic.instances) {
            if (instance.hitTest(point)) {
                console.log("WE HIT:");
                console.log(instance);
                return instance;
            }
        }
        return null;
    }
    handleMouseDown = e => {
        console.log("mouse down");

        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.ui_state.mouse_pos);
        console.log("WE HIT:");
        console.log(whatd_we_hit);
        if (whatd_we_hit) {
            this.ui_state.selected_entity = whatd_we_hit;
            whatd_we_hit.highlight();
        }

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.DrawWire: this.addWireVertex(); break;
            case UiModes.AddInstance: this.commitInstance(); break;
            default: break;
        }
    }
    handleMouseUp = e => {
        // console.log("mouse up");
        // if (this.ui_state.selected_entity) {
        //     this.ui_state.selected_entity.unhighlight();
        //     this.ui_state.selected_entity = null;
        // }
    }
    // Handle mouse click events.
    handleClick = e => {
        console.log("click");
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.ui_state.mouse_pos);
        console.log("WE HIT:");
        console.log(whatd_we_hit);

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.DrawWire: this.addWireVertex(); break;
            case UiModes.AddInstance: this.commitInstance(); break;
            default: break;
        }
    }
    // Handle double-click events.
    handleDoubleClick = e => {
        // FIXME: hit testing, finding which element was clicked on.
        // const whatd_we_hit = this.whatd_we_hit(e);
        console.log("double click");

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.DrawWire: this.commitWire(); break;
            default: break;
        }
    }
    // Handle mouse movement events.
    handleMouseMove = e => {
        // Update our tracking of the mouse position.
        this.ui_state.mouse_pos = new Point(e.clientX, e.clientY);

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.DrawWire: this.updateDrawWire(); break;
            case UiModes.AddInstance: this.updateAddInstance(); break;
            default: break;
        }
    }
    // Enter the `DrawWire` mode, and create the tentative Wire. 
    startDrawWire = () => {
        this.ui_state.mode = UiModes.DrawWire;
        const start = nearestOnGrid(this.ui_state.mouse_pos);
        const wire = new Wire([start, start.copy()]);
        this.ui_state.selected_entity = wire;
        wire.draw();
    }
    // Update the rendering of an in-progress wire.
    updateDrawWire = () => {
        // Get the active Wire, its points, and the second-to-last one for relative calculations.
        const wire = this.ui_state.selected_entity;
        let points = wire.points;
        const prev_point = points[wire.points.length - 2];

        // Sort out the closest Manhattan-separated point on the grid. 
        const landing = this.nearestManhattan(this.ui_state.mouse_pos, prev_point);

        // Chop out the last point, replacing it with the new landing point.
        points = points.slice(0, -1);
        points.push(landing);

        // Remove the previous wire-path from the scene, and redraw it.
        two.remove(wire.drawing);
        const newWire = new Wire(points);
        this.ui_state.selected_entity = newWire;
        newWire.draw();
        two.update();
    }
    // Add a new wire vertex to the currently-drawn wire.
    addWireVertex = () => {
        // Get the active Wire, its points, and the second-to-last one for relative calculations.
        const wire = this.ui_state.selected_entity;
        let points = wire.points;
        const prev_point = points[wire.points.length - 2];

        // Sort out the closest Manhattan-separated point on the grid. 
        const landing = this.nearestManhattan(this.ui_state.mouse_pos, prev_point);
        if (landing.x == prev_point.x && landing.y == prev_point.y) {
            // If this is the same point, no need to make updates, we're done.
            return;
        }

        // Chop out the last point, replacing it with *two* of the landing point.
        points = points.slice(0, -1);
        points.push(landing);
        points.push(landing.copy());

        // Remove the previous wire-path from the scene, and redraw it.
        two.remove(wire.drawing);
        const newWire = new Wire(points);
        this.ui_state.selected_entity = newWire;
        newWire.draw();
        two.update();
    }
    // Commit the currently-drawn wire to the schematic.
    // Removes it from `selected_entity` and adds it to the schematic.
    commitWire = () => {
        // Get the wire, and replace it in `ui_state` with null.
        const wire = this.ui_state.selected_entity;
        this.ui_state.selected_entity = null;
        this.ui_state.mode = UiModes.Idle;

        // FIXME: this will probably want some more computing at commit-time, 
        // adding entity stuff, figuring out hit-test areas, etc. 

        // Add the wire to the schematic.
        this.schematic.wires.push(wire);
        console.log(this.schematic);
    }
    // Find the nearest Manhattan-separated point on the grid relative to `relativeTo`.
    nearestManhattan = (loc, relativeTo) => {
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
    addInstance = () => {
        this.ui_state.mode = UiModes.AddInstance;
        // FIXME: some provision for different instance types! 
        this.addNmos();
    }
    addNmos = () => {
        const name = `nmos${this.ui_state.num_instances}`;
        this.ui_state.num_instances += 1;
        const of = `nmos(something)`;
        const instance = new Instance({ name: name, of: of, kind: PrimitiveEnum.Nmos, loc: this.ui_state.mouse_pos, orientation: Orientation.default() });
        this.schematic.instances.push(instance);
        instance.draw();
    }
    updateAddInstance = () => {
        console.log("FIXME: commitInstance!");
    }
    commitInstance = () => {
        console.log("FIXME: commitInstance!");
        this.ui_state.mode = UiModes.Idle;
    }

}

// Serialize a schematic to an SVG string.
const serialize = schematic => {

    let svg = `<?xml version="1.0" encoding="utf-8"?>
    <svg width="${schematic.size.x}" height="${schematic.size.y}" xmlns="http://www.w3.org/2000/svg">`;

    // Add schematic styling.
    svg += `
    
    <defs>
        <!-- Grid Background -->
        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
        </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" stroke="gray" stroke-width="1"/>

    ${schematicStyle}
    <!-- Svg Schematic Content -->\n`;

    // Create the SVG `<g>` group for an `Instance`. 
    const instanceSvg = inst => {
        const primitive = PrimitiveMap.get(inst.kind);
        if (!primitive) {
            throw new Error(`No primitive for ${inst}`);
        }
        const name = inst.name || 'unnamed';
        const of = inst.of || 'unknown';
        return `
        <g class="hdl21-instance" transform="matrix(1 0 0 1 ${inst.loc.x} ${inst.loc.y})">
            ${primitive.svgStr}

            <text x="${primitive.nameloc.x}" y="${primitive.nameloc.y}"  class="hdl21-instance-name">${name}</text>
            <text x="${primitive.ofloc.x}" y="${primitive.ofloc.y}" class="hdl21-instance-of">${of}</text>
        </g>`;
    }

    // Write each instance to the SVG.
    for (let inst of schematic.instances) {
        svg += instanceSvg(inst);
    }
    svg += `\n\n`;

    // Create the SVG `<g>` element for a `Wire`, including its path and wire-name. 
    const wireSvg = wire => {
        if (!wire.points) {
            return;
        }
        const [first, ...rest] = wire.points;
        let rv = `<g class="hdl21-wire"> \n    `;
        rv += `<path class="hdl21-wire" d="M ${first.x} ${first.y}`;
        for (let p of rest) {
            rv += ` L ${p.x} ${p.y}`;
        }
        rv += `" /> \n`;
        rv += `<text visibility="hidden" class="hdl21-wire-name">??????</text> \n`;
        rv += `</g> \n`;
        return rv;
    }

    // Write each wire to the SVG.
    for (let wire of schematic.wires) {
        svg += wireSvg(wire);
    }

    // And finally add the closing tag. 
    svg += '\n\n</svg>';
    console.log("Serialized:");
    console.log(svg);
    return svg;
}


// Enumerated Rotations 
// in increments of 90 degrees
const Rotation = Object.freeze({
    R0: Symbol("R0"),
    R90: Symbol("R90"),
    R180: Symbol("R180"),
    R270: Symbol("R270"),
});

// Instance Orientation 
// including reflection & rotation 
// 
class Orientation {
    constructor(reflected, rotation) {
        this.reflected = reflected; // Boolean
        this.rotation = rotation;   // Rotation 
    }
    // The default orientation: no reflection, no rotation.
    static default() /* => Orientation */ {
        return new Orientation(false, Rotation.R0);
    }
    // Create an `Orientation` from an `OrientationMatrix`. 
    // A very small subset of possible matrices are valid; 
    // any other value provided throws an error.
    static fromMatrix(matrix /* OrientationMatrix */) /* => Orientation */ {

        var reflected; // Boolean - flipped across the x axis
        var rotation; // Rotation in increments of 90 degrees, valued 0-3

        // There are a total of eight valid values of the Instance transform.
        // Check each, and if we have anything else, fail. 
        // SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to 
        // | a c |
        // | b d |
        if (matrix.eq(new OrientationMatrix(1, 0, 0, 1))) {
            reflected = false;
            rotation = Rotation.R0;
        } else if (matrix.eq(new OrientationMatrix(0, 1, -1, 0))) {
            reflected = false;
            rotation = Rotation.R90;
        } else if (matrix.eq(new OrientationMatrix(-1, 0, 0, -1))) {
            reflected = false;
            rotation = Rotation.R180;
        } else if (matrix.eq(new OrientationMatrix(0, -1, 1, 0))) {
            reflected = false;
            rotation = Rotation.R270;
        } else if (matrix.eq(new OrientationMatrix(1, 0, 0, -1))) {
            reflected = true;
            rotation = Rotation.R0;
        } else if (matrix.eq(new OrientationMatrix(0, 1, 1, 0))) {
            reflected = true;
            rotation = Rotation.R90;
        } else if (matrix.eq(new OrientationMatrix(-1, 0, 0, 1))) {
            reflected = true;
            rotation = Rotation.R180;
        } else if (matrix.eq(new OrientationMatrix(0, -1, -1, 0))) {
            reflected = true;
            rotation = Rotation.R270;
        } else {
            throw new Error(`Invalid transform: ${matrix}`);
        }

        // Success - create and return the Orientation.
        return new Orientation(reflected, rotation);
    }
}

// 
// # Orientation Matrix 
// 
// 2x2 matrix representation of an `Orientation`
// Largely corresponds to the values placed in SVG `matrix` attributes.
// SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to 
// | a c |
// | b d |
// The fields of `OrientationMatrix` are named similarly. 
// 
class OrientationMatrix {
    constructor(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }
    // Orientation Matrix Equality 
    eq = other => /* bool */ {
        return this.a === other.a && this.b === other.b && this.c === other.c && this.d === other.d;
    }
}

class Importer {
    constructor() {
        this.schematic = new Schematic();
        this.otherSvgElements = [];
    }
    static import = svgstring => /* Schematic */ {
        const me = new Importer();
        const svgDoc = svgparse(svgstring);
        return me.importSvgDoc(svgDoc);
    };
    importSvgDoc = svgDoc => {
        // FIXME: handle case where there's stuff other than <svg> in the document.
        const svg = svgDoc.children[0];
        console.log(svg);

        const width = svg.properties.width || 1600;
        const height = svg.properties.height || 800;
        this.schematic.size = new Point(width, height);

        // Walk its SVG children, adding HDL elements. 
        for (const child of svg.children) {
            if (child.type === 'element' && child.tagName === 'g') {

                if (child.properties.class === "hdl21-instance") {
                    this.importInstance(child);
                } else if (child.properties.class === "hdl21-wire") {
                    this.importWire(child);
                } else {
                    this.addOtherSvgElement(child);
                }

            } else {
                this.addOtherSvgElement(child);
            }
        }
        return this.schematic;

    };
    // Import an instance
    importInstance = svgGroup => {
        const transform = svgGroup.properties.transform;
        if (!transform) {
            throw new Error(`Instance ${svgGroup.properties.id} has no transform`);
        }
        const [loc, orientation] = this.importTransform(transform);

        if (svgGroup.children.length !== 3) {
            throw new Error(`Instance ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the three children: the symbol, instance name, and instance-of string.
        const [symbolGroup, nameElem, ofElem] = svgGroup.children;

        // Get the symbol type from the symbol group.
        var kind;
        if (symbolGroup.properties.class === "hdl21::primitives::nmos") {
            kind = PrimitiveEnum.Nmos;
        } else if (symbolGroup.properties.class === "hdl21::primitives::pmos") {
            kind = PrimitiveEnum.Pmos; // FIXME! all the other symbols
        } else {
            throw new Error(`Instance ${svgGroup.properties.id} has unknown symbol class ${symbolGroup.properties.class}`);
        }

        // Get the instance name.
        if (nameElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;

        // Get the instance-of string.
        if (ofElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const of = ofElem.children[0].value;

        // Create and add the instance 
        const instance = new Instance({ name: name, of: of, kind: kind, loc: loc, orientation: orientation });
        this.schematic.instances.push(instance);
    };
    // Import an SVG `transform` to a location `Point` and an `Orientation`. 
    importTransform = transform => {
        // Start splitting up the `transform` string.
        const splitParens = transform.split(/\(|\)/);
        if (splitParens.length !== 3 || splitParens[0] !== 'matrix') {
            throw new Error(`Invalid transform: ${transform}`);
        }

        // Split the numeric section, hopefully into six values 
        const numbers = splitParens[1].split(/\,|\s/).map(s => parseInt(s));
        if (numbers.length !== 6) {
            throw new Error(`Invalid transform: ${transform}`);
        }

        // Get the (x, y) position 
        const x = numbers[4];
        const y = numbers[5];
        const loc = new Point(x, y);

        // And sort out orientation from the first four numbers
        const m = numbers.slice(0, 4);
        const matrix = new OrientationMatrix(m[0], m[1], m[2], m[3]);
        return [loc, Orientation.fromMatrix(matrix)];
    };
    // Import a wire group
    importWire = svgGroup => {
        if (svgGroup.children.length !== 2) {
            throw new Error(`Wire ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the two children: the path and the wire name
        const [pathElem, nameElem] = svgGroup.children;

        // Get the points from the path element.
        const pathData = pathElem.properties.d;
        const pathSplit = pathData.split(/\s/);
        if (pathSplit[0] !== "M") {
            throw new Error(`Wire ${svgGroup.properties.id} has invalid path data`);
        }
        let points = [];
        for (let i = 1; i < pathSplit.length; i += 3) {
            const x = parseInt(pathSplit[i]);
            const y = parseInt(pathSplit[i + 1]);
            points.push(new Point(x, y));
        }

        // Get the wire name.
        if (nameElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;
        // FIXME: actually store it! 

        // Create and add the wire
        const wire = new Wire(points);
        this.schematic.wires.push(wire);
    };
    // Add an element to the "other", non-schematic elements list.
    addOtherSvgElement = svgElement => {
        console.log(`other elem:`);
        console.log(svgElement);
        this.otherSvgElements.push(svgElement);
    };
}


// Create the `SchEditor` variable, in module scope. 
const the_editor = new SchEditor(null, new UiState());
the_editor.startup();


THE_PLATFORM.handleLoadFile((_event, content) => {
    // Load schematic content from the file.
    const schematic = Importer.import(content);
    // FIXME: error handling here
    the_editor.loadSchematic(schematic);
});

// Send a message back to the main process, to indicate this has all run 
THE_PLATFORM.sendRendererUp("Renderer is ALIIIIIIIVE");
