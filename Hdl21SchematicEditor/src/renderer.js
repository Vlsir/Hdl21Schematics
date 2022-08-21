/**
 * # Hdl21 Schematics Renderer
 * 
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic. 
 */

import Two from 'two.js';
import './index.css';
// import something from './nmos.svg';
// console.log(something);


// Global stuff, at least for now 
var two = new Two({
    // Lotta futzing with these options has found these two to be indispensible. 
    fullscreen: true,
    autostart: true,
    // Perhaps some day we can better understand what goes on with the others. 
    // Particularly when implementing resizing.
    // fitted: true,
    // width: window.innerWidth,
    // height: window.innerHeight,
    // width: 1600,
    // height: 800,
}).appendTo(document.body);
const the_nmos_symbol = document.querySelectorAll('div#the_nmos svg')[0];
console.log(the_nmos_symbol);



// var parser = new DOMParser();
// var doc = parser.parseFromString(`
// <div id="the_nmos">
//   <svg>
//     <g id="hdl21::nmos">
//       <path d="M 0 0 L 0 8 L 10 8 L 10 24 L 0 24 L 0 32 "
//         style="fill: none; stroke: rgb(0, 0, 0); stroke-opacity: 1; stroke-linecap: round; stroke-width: 4px; stroke-dashoffset: 0px;" />
//       <path d="M 16 8 L 16 24"
//         style="fill: none; stroke: rgb(0, 0, 0); stroke-opacity: 1; stroke-linecap: square; stroke-width: 4px; stroke-dashoffset: 0px;" />
//       <path d="M 4 28 L -2 24 L 4 20 Z"
//         style="fill: none; stroke: rgb(0, 0, 0); stroke-opacity: 1; stroke-miterlimit: 0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 4px; stroke-dashoffset: 0px;" />
//       <text x=10 y=40 class="heavy">@of</text>
//       <text x=10 y=0 class="heavy">@name</text>
//     </g>
//   </svg>
// </div>`, "text/html");
// console.log(doc);
// const the_nmos_symbol = doc.querySelectorAll('div#the_nmos svg')[0];
// console.log(the_nmos_symbol);



const TheSchSymbols = Object.freeze({
    Port: Symbol("Port"),
    Nmos4: Symbol("Nmos4"),
    Pmos4: Symbol("Pmos4"),
    Vsource2: Symbol("Vsource2"),
    Vsource4: Symbol("Vsource4"),
    Isource2: Symbol("Isource2"),
    Isource4: Symbol("Isource4"),
    Res2: Symbol("Res2"),
    Res3: Symbol("Res3"),
    Res4: Symbol("Res4"),
    Cap2: Symbol("Cap2"),
    Cap3: Symbol("Cap3"),
    Cap4: Symbol("Cap4"),
    Ind2: Symbol("Ind2"),
    Ind3: Symbol("Ind3"),
    Ind4: Symbol("Ind4"),
});


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
class Instance {
    constructor(name, of, kind, loc, drawing) {
        this.name = name;
        this.of = of;
        this.kind = kind;
        this.loc = loc;
        this.orientation = null; // FIXME! add
        this.drawing = drawing;
    }
    // Abort drawing an in-progress instance.
    abort = () => {
        // FIXME! 
        // two.remove(this.drawing);
    }
}
class Wire {
    constructor(points /* Point[] */, path /* Two.Path */) {
        this.points = points;
        this.path = path;
    }
    // Create from a list of `Point`s. Primarily creates the drawn `Path`. 
    static from_points(points /* Point[] */) {
        // Flatten coordinates into the form [x1, y1, x2, y2, ...]
        let coords = [];
        for (let point of points) {
            coords.push(point.x, point.y);
        }
        // Create the path 
        const path = two.makePath(...coords);

        // Set the wire style 
        path.visible = true;
        path.closed = false;
        path.noFill();
        path.stroke = 'rgb(150, 100, 255)';
        path.linewidth = 5;

        return new Wire(points, path);
    }
    // Abort drawing an in-progress wire.
    abort = () => {
        two.remove(this.path);
    }
}
class Schematic {
    constructor() {
        this.instances = [];
        this.wires = [];
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
    // Perform all of our startup activity, binding events, etc.
    startup = () => {
        // Bind UI events
        window.addEventListener('resize', e => console.log(e));
        window.addEventListener("keydown", this.handleKey);
        window.addEventListener('mousemove', this.handleMouseMove, true);
        window.addEventListener("click", this.handleClick);
        window.addEventListener("dblclick", this.handleDoubleClick);

        // Set up the background grid
        this.setupGrid();

        // FIXME: does all kinda stuff, will become "drawSchematic" or similar. 
        this.do_everything();
    }
    // Do it all. Our initial entry point replacement for a big file-worth of code.
    do_everything = () => {
        this.addNmos();
    }
    // Set up the background grid
    setupGrid = () => {
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
        for (let i = 0; i < two.width; i += 10) {
            const line = two.makeLine(i, 0, i, two.height);
            styleLine(line, i % 100 == 0);
        }
        for (let i = 0; i < two.height; i += 10) {
            const line = two.makeLine(0, i, two.width, i);
            styleLine(line, i % 100 == 0);
        }
    }
    // Given a `Point`, return the nearest grid point.
    nearestOnGrid = loc /* Point */ => /* Point */ {
        const grid_size = 10;
        return new Point(
            Math.round(loc.x / grid_size) * grid_size,
            Math.round(loc.y / grid_size) * grid_size
        );
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
            case Keys.Comma: window.electronAPI.saveFile(serialize(this.schematic)); break;
            default: console.log(`Key we dont use: ${e.key}`); break;
        }
    }
    whatdWeHit = e => {
        console.log("WHATD WE HIT", e);
    }
    // Handle mouse click events.
    handleClick = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(e);
        console.log("click");

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
        const start = this.nearestOnGrid(this.ui_state.mouse_pos);
        const wire = Wire.from_points([start, start.copy()]);
        this.ui_state.selected_entity = wire;
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
        two.remove(wire.path);
        this.ui_state.selected_entity = Wire.from_points(points);
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
        two.remove(wire.path);
        this.ui_state.selected_entity = Wire.from_points(points);
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
        return this.nearestOnGrid(landing1);
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


        const nmos = two.interpret(the_nmos_symbol);
        console.log(nmos);
        // nmos.center();
        nmos.visible = true;
        // nmos.translation.set(two.width / 2, two.height / 2);
        nmos.translation.set(this.ui_state.mouse_pos.x, this.ui_state.mouse_pos.y);




        // Update the renderer in order to generate
        // the SVG DOM Elements. Then bind the events
        // to those elements directly.
        two.update();

        const instance = new Instance(name, of, TheSchSymbols.Nmos4, this.ui_state.mouse_pos, nmos);
        this.schematic.instances.push(instance);

        var highlighted = false;
        var dragging = false;
        var mouse = new Two.Vector();


        function mousedown(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            dragging = true;
            var rect = nmos.getBoundingClientRect();
            dragging = mouse.x > rect.left && mouse.x < rect.right
                && mouse.y > rect.top && mouse.y < rect.bottom;
            highlighted = !highlighted;
            // nmos.stroke = 'rgb(150, 100, 255)';
            if (highlighted) {
                nmos.stroke = 'rgb(0, 0, 0)';
            } else {
                nmos.stroke = 'rgb(150, 100, 255)';
            }
            window.addEventListener('mousemove', mousemove, false);
            window.addEventListener('mouseup', mouseup, false);
        }

        const mousemove = (e) => {
            var dx = e.clientX - mouse.x;
            var dy = e.clientY - mouse.y;
            const scale = 1.0; // FIXME
            // console.log((dx, dy));
            // console.log(nmos.position);
            if (dragging) {
                // Snap to our grid
                const snapped = this.nearestOnGrid(this.ui_state.mouse_pos);
                nmos.position.x = snapped.x;
                nmos.position.y = snapped.y;
                instance.loc = snapped;
                console.log(nmos.position);
            } else {
                zui.translateSurface(dx, dy);
            }
            mouse.set(e.clientX, e.clientY);
        }

        function mouseup(e) {
            highlighted = !highlighted;
            if (highlighted) {
                nmos.stroke = 'rgb(0, 0, 0)';
            } else {
                nmos.stroke = 'rgb(150, 100, 255)';
            }
            // nmos.stroke = 'rgb(0, 0, 0)';
            window.removeEventListener('mousemove', mousemove, false);
            window.removeEventListener('mouseup', mouseup, false);
        }

        nmos._renderer.elem.addEventListener('mousedown', mousedown, false);
    }

}

// Create the module-context editor. 
// FIXME: get initial data from the main process and OS.
var the_editor = new SchEditor(new Schematic(), new UiState());
the_editor.startup();


// Serialize a schematic to an SVG string.
const serialize = schematic => {
    const outline = new Point(500, 500);
    let svg = `<?xml version="1.0" encoding="utf-8"?>
    <svg width="${outline.x}" height="${outline.y}" xmlns="http://www.w3.org/2000/svg">`;

    // Add the symbol and styling <defs>.
    svg += `
        <defs>
        <!-- Styling for Symbol and Wire Elements -->
        <style>
        .hdl21-symbols {
            fill: none;
            stroke: grey;
            stroke-opacity: 1;
            stroke-miterlimit: 0;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 4px;
            stroke-dashoffset: 0px;
        }

        .hdl21-labels {
            fill: grey;
            font-family: comic sans ms; /* We know, it's just too funny */
            font-size: 16px;
        }

        .hdl21-wires {
            fill: none;
            stroke: magenta;
            stroke-opacity: 1;
            stroke-miterlimit: 0;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 4px;
            stroke-dashoffset: 0px;
        }
        </style>

        <!-- The Symbol Library -->
        <g id="hdl21::primitives::nmos">
            <path d="M 0 0 L 0 8 L 10 8 L 10 24 L 0 24 L 0 32" class="hdl21-symbols" />
            <path d="M 16 8 L 16 24" class="hdl21-symbols" />
            <path d="M 4 28 L -2 24 L 4 20 Z M 4 36" class="hdl21-symbols" />
        </g>

    </defs> <!-- End Definitions -->
    
    <!-- Svg Schematic Content -->
    `;

    // Create the SVG `<g>` group for an `Instance`. 
    const instanceSvg = inst => {
        const name = inst.name || 'unnamed';
        const of = inst.of || 'unknown';
        return `
        <g class="hdl21-instance" transform="matrix(1 0 0 1 ${inst.loc.x} ${inst.loc.y})">
            <use  x="0" y="0"  href="#hdl21::primitives::nmos" />
            <text x="5" y="0"  class="hdl21-labels">@${name}</text>
            <text x="5" y="45" class="hdl21-labels">@${of}</text>
        </g>`;
    }

    // Write each instance to the SVG.
    for (let inst of schematic.instances) {
        svg += instanceSvg(inst);
    }

    // Create the SVG `<path>` element for a `Wire`. 
    const wireSvg = wire => {
        const [first, ...rest] = wire.points;
        let rv = `<path class="hdl21-wires" d="M ${first.x} ${first.y}`;
        for (let p of rest) {
            rv += ` L ${p.x} ${p.y}`;
        }
        rv += ` " />`;
        return rv;
    }

    // Write each wire to the SVG.
    for (let wire of schematic.wires) {
        svg += wireSvg(wire);
    }

    // And finally add the closing tag. 
    svg += '\n\n</svg>';
    return svg;


}