/*
 * # Hdl21 Schematics Editor
 * 
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic. 
 */

import { parse as svgparse } from 'svg-parser';
import Two from 'two.js';


// Recursively traverse a node with a list of `children`, 
// applying `fn` to each node.
const traverseAndApply = (node, fn) => {
    fn(node);
    if (node.children) {
        node.children.forEach(child => traverseAndApply(child, fn));
    }
}

// Apply the `hdl21-symbols` styling in two.js terms
const symbolStyle = symbol => {
    symbol.noFill();
    symbol.stroke = 'black';
    symbol.linewidth = 10;
    symbol.cap = 'round';
    symbol.join = 'round';
    return symbol;
}

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
  fill: black;
  stroke: black;
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

/* Dark Mode Color Overrides */
@media (prefers-color-scheme:dark) {
    svg {
        background-color: #1e1e1e;
    }
    .hdl21-wire {
        stroke: #87d3f8;
    }
    .hdl21-symbols {
        stroke: darkgrey;
    }
    .hdl21-labels,
    .hdl21-instance-name,
    .hdl21-instance-of,
    .hdl21-wire-name {
        fill: grey;
    }
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
        this.svgTag = args.svgTag;   // string, svg class-name
        this.svgStr = args.svgStr;   // SVG-valued string
        this.ports = args.ports;     // [Port]
        this.nameloc = args.nameloc; // Point
        this.ofloc = args.ofloc;     // Point
        this.defaultNamePrefix = args.defaultNamePrefix || "x"; // string
        this.defaultOf = args.defaultOf || "of()";      // string
    }
    // Create a new Primitive, and add it to module-scope mappings.
    static add(args) {
        const prim = new Primitive(args);
        PrimitiveMap.set(args.enumval, prim);
        PrimitiveTags.set(args.svgTag, prim);
    }
}
// Map from enumerated keys to `Primitive` objects.
const PrimitiveMap = new Map();
// Map from tags to `Primitive` objects.
const PrimitiveTags = new Map();

Primitive.add({
    enumval: PrimitiveEnum.Nmos,
    svgTag: "hdl21::primitives::nmos",
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
        new Port({ name: "g", loc: new Point(70, 40) }),
        new Port({ name: "s", loc: new Point(0, 80) }),
        new Port({ name: "b", loc: new Point(-20, 40) }),
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
    defaultNamePrefix: "n",
    defaultOf: "nmos()",
});
Primitive.add({
    enumval: PrimitiveEnum.Pmos,
    svgTag: "hdl21::primitives::pmos",
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
        new Port({ name: "g", loc: new Point(70, 40) }),
        new Port({ name: "s", loc: new Point(0, 80) }),
        new Port({ name: "b", loc: new Point(-20, 40) }),
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
    defaultNamePrefix: "p",
    defaultOf: "pmos()",
});
Primitive.add({
    enumval: PrimitiveEnum.Input,
    svgTag: "hdl21::primitives::input",
    svgStr: `
    <g class="hdl21::primitives::input">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M 30 10 L 50 10" class="hdl21-symbols" />
        <circle cx="50" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
    ports: [
        new Port({ name: "FIXME", loc: new Point(50, 10) }),
    ],
    nameloc: new Point(10, -15),
    ofloc: new Point(10, 35),
    defaultNamePrefix: "i",
    defaultOf: "input()",
});
Primitive.add({
    enumval: PrimitiveEnum.Output,
    svgTag: "hdl21::primitives::output",
    svgStr: `
    <g class="hdl21::primitives::output">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L 0 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
    ports: [
        new Port({ name: "FIXME", loc: new Point(-20, 10) }),
    ],
    nameloc: new Point(10, -15),
    ofloc: new Point(10, 35),
    defaultNamePrefix: "o",
    defaultOf: "output()",
});
Primitive.add({
    enumval: PrimitiveEnum.Inout,
    svgTag: "hdl21::primitives::inout",
    svgStr: `
    <g class="hdl21::primitives::inout">
        <path d="M 0 0 L -10 10 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L -10 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
    ports: [
        new Port({ name: "FIXME", loc: new Point(-20, 10) }),
    ],
    nameloc: new Point(10, -15),
    ofloc: new Point(10, 35),
    defaultNamePrefix: "io",
    defaultOf: "inout()",
});
// FIXME: add all the other elements

// Enumerated Kinds of Schematic Entities
const EntityKind = Object.freeze({
    Instance: Symbol("Instance"),
    Port: Symbol("Port"),
    Label: Symbol("Label"),
    Wire: Symbol("Wire"),
});

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
    constructor(args) {
        this.kind = args.kind; // EntityKind
        this.obj = args.obj;   // Inner object
    }
    // Create and add the drawn, graphical representation
    draw = () => { return this.obj.draw(); }
    // Update styling to indicate highlighted-ness
    highlight = () => { return this.obj.highlight(); }
    // Update styling to indicate the lack of highlighted-ness
    unhighlight = () => { return this.obj.unhighlight(); }
    // Boolean indication of whether `point` is inside the instance.
    hitTest = point => { return this.obj.hitTest(point); }
    // Abort an in-progress instance.
    abort = () => { return this.obj.abort(); }
}
const LabelKind = Object.freeze({
    Name: Symbol("Name"),
    Of: Symbol("Of"),
});
// # Text Label 
// 
class Label {
    constructor(args) {
        this.text = args.text; // string
        this.loc = args.loc;   // Point
        this.kind = args.kind; // LabelKind
        this.parent = args.parent; // Entity
        this.drawing = null;
        this.bbox = null;
    }
    // Update our text value
    update = text => {
        this.text = text;
        this.drawing.value = text;
        this.bbox = this.drawing.getBoundingClientRect();
        this.parent.updateLabel(this);
    }
    draw = () => {
        if (this.drawing) { // Remove any existing drawing 
            this.parent.drawing.remove(this.drawing);
            two.remove(this.drawing);
            this.drawing = null;
        }
        // Create the drawn text element 
        const textElem = two.makeText(this.text);
        // Set its position
        textElem.translation.set(this.loc.x, this.loc.y);
        // Apply our label styling 
        textElem.alignment = 'left';
        textElem.family = 'Comic Sans MS';
        textElem.style = 'heavy';
        textElem.size = 16;
        // Affix it as our `drawing` field
        this.drawing = textElem;
        // Add it to our parent 
        // Note this must be done *before* we compute the bounding box. 
        this.parent.drawing.add(this.drawing);
        // And compute its bounding box
        this.bbox = textElem.getBoundingClientRect();
    }
    // Boolean indication of whether `point` is inside the instance.
    hitTest = point => {
        if (!this.bbox) {
            return false;
        }
        const bbox = this.bbox;
        return point.x > bbox.left && point.x < bbox.right
            && point.y > bbox.top && point.y < bbox.bottom;
    }
    // Update styling to indicate highlighted-ness
    highlight = () => {
        // FIXME: merge with styling
        // FIXME: keep `stroke` off for text
        // this.drawing.stroke = "red";
        this.drawing.fill = "red";
        this.highlighted = true;
    }
    // Update styling to indicate the lack of highlighted-ness
    unhighlight = () => {
        // FIXME: merge with styling
        // this.drawing.stroke = "black";
        this.drawing.fill = "black";
        this.highlighted = false;
    }
    // Abort an in-progress instance.
    abort = () => { }
}


// # Schematic Instance 
// 
// Combination of the Instance data and drawn visualization. 
// 
class Instance {
    constructor(args) {
        // Instance Data
        this.name = args.name;   // string
        this.of = args.of;       // string
        this.kind = args.kind;   // PrimitiveEnum
        this.loc = args.loc;     // Point
        this.orientation = args.orientation;  // Orientation

        // Number, unique ID. Not a constructor argument. 
        this.entityId = null;

        // Drawing data, set during calls to `draw()`.
        // The two.js drawing, implemented as a Two.Group.
        this.drawing = null;
        // The bounding box for hit testing. 
        this.bbox = null;
        this.highlighted = false; // bool
    }
    highlight = () => {
        this.highlighted = true;
        if (!this.drawing) { return; }
        traverseAndApply(this.drawing, node => {
            // FIXME: merge with styling
            // FIXME: this needs to set `fill` for text elements
            // node.fill = "red";
            node.stroke = "red";
        });
    }
    unhighlight = () => {
        this.highlighted = false;
        if (!this.drawing) { return; }
        traverseAndApply(this.drawing, node => {
            // FIXME: merge with styling
            // FIXME: this needs to set `fill` for text elements
            // node.fill = "black";
            node.stroke = "black";
        });
    }
    // Get references to our child `Label`s.
    labels = () => {
        return [this.nameLabel, this.ofLabel];
    }
    // Create and draw the Instance's `drawing`. 
    draw = () => {
        const primitive = PrimitiveMap.get(this.kind);
        if (!primitive) {
            console.log(`No primitive for kind ${this.kind}`);
            return;
        }
        if (this.drawing) { // Remove any existing drawing 
            two.remove(this.drawing);
            this.drawing = null;
        }

        // Load the symbol as a Two.Group. 
        // Note we apply the styling and wrap the content in <svg> elements.
        const symbolSvgStr = /*schematicStyle +*/ "<svg>" + primitive.svgStr + "</svg>";
        const symbol = two.load(symbolSvgStr);
        traverseAndApply(symbol, symbolStyle);
        two.add(symbol);

        // Create the Instance's drawing-Group, including its symbol, names, and ports.
        this.drawing = two.makeGroup();
        this.drawing.add(symbol);

        // Apply our vertical flip if necessary, via a two-dimensional `scale`-ing.
        this.drawing.scale = 1;
        if (this.orientation.reflected) {
            this.drawing.scale = new Two.Vector(1, -1);
        }
        // Apply rotation. Note two.js applies rotation *clockwise*, 
        // hence the negation of 90 and 270 degrees. 
        const radianRotation = () => {
            switch (this.orientation.rotation) {
                case Rotation.R0: return 0;
                case Rotation.R90: return -Math.PI / 2;
                case Rotation.R180: return Math.PI;
                case Rotation.R270: return Math.PI / 2;
            }
        }
        this.drawing.rotation = radianRotation();
        this.drawing.translation.set(this.loc.x, this.loc.y);

        // Set the bounding box for hit testing.
        // Note this must come *after* the drawing is added to the scene.
        this.bbox = symbol.getBoundingClientRect();

        // Create and add the instance-name Label
        this.nameLabel = new Label({ text: this.name, kind: LabelKind.Name, loc: primitive.nameloc, parent: this });
        this.nameLabel.draw();

        // Create and add the instance-of Label 
        this.ofLabel = new Label({ text: this.of, kind: LabelKind.Of, loc: primitive.ofloc, parent: this });
        this.ofLabel.draw();

        if (this.highlighted) { this.highlight(); }
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
        if (this.drawing) { // Remove any existing drawing 
            two.remove(this.drawing);
            this.drawing = null;
        }
    }
    // Update the string-value from a `Label`. 
    updateLabel = label => {
        if (label.kind === LabelKind.Name) {
            this.name = label.text;
        } else if (label.kind === LabelKind.Of) {
            this.of = label.text;
        } else {
            console.log("Unknown label kind");
        }
    }
}

// # Horizontal / Vertical Direction Enum 
const Direction = Object.freeze({
    Horiz: Symbol("Horiz"),
    Vert: Symbol("Vert"),
});

// # Manhattan Wire Segment
// Runs either horizontally or vertically in direction `dir`,
// at a constant coordinate `at` and between `start` and `end`.
class ManhattanWireSegment {
    constructor(args) {
        this.direction = args.direction; // Direction
        this.at = args.at; // Number
        this.start = args.start; // Number
        this.end = args.end; // Number
    }
    // Boolean indication of whether `pt` intersects this segment."""
    hitTest = pt => {  // Boolean
        const HIT_TEST_WIDTH = 10; // Equaly to the drawn width.

        if (this.direction === Direction.Horiz) {
            return Math.abs(pt.y - this.at) < HIT_TEST_WIDTH / 2 && pt.x >= this.start && pt.x <= this.end;
        }
        // Vertical segment
        return Math.abs(pt.x - this.at) < HIT_TEST_WIDTH / 2 && pt.y >= this.start && pt.y <= this.end;
    }
}

class Wire {
    constructor(points /* Point[] */) {
        this.points = points;
        this.drawing = null; /* Two.Path, set by `draw()` */
        this.highlighted = false; // bool
        this.segments = null;
        // Number, unique ID. Not a constructor argument. 
        this.entityId = null;
    }
    // Create from a list of `Point`s. Primarily creates the drawn `Path`. 
    draw = () => {
        if (this.drawing) { // Remove any existing drawing
            two.remove(this.drawing);
            this.drawing = null;
        }
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

        if (this.highlighted) { this.highlight(); }
    }
    // Abort drawing an in-progress wire.
    abort = () => {
        two.remove(this.drawing);
    }
    // Update styling to indicate highlighted-ness
    highlight = () => {
        this.drawing.stroke = "red";
        this.highlighted = true;
    }
    // Update styling to indicate the lack of highlighted-ness
    unhighlight = () => {
        this.drawing.stroke = "blue";
        this.highlighted = false;
    }
    // Boolean indication of whether `point` is inside the instance.
    hitTest = point => {
        if (!this.segments) {
            this.calcSegments();
        }
        return this.segments.some(segment => segment.hitTest(point));
    }
    // Extract Manhattan segments from the wire's points.
    calcSegments = () => {
        this.segments = [];
        let [pt, ...rest] = this.points;
        for (let nxt of rest) {
            var seg;
            if (pt.x == nxt.x) {
                const start = Math.min(pt.y, nxt.y)
                const end = Math.max(pt.y, nxt.y)
                seg = new ManhattanWireSegment({ direction: Direction.Vert, at: pt.x, start: start, end: end });
            } else if (pt.y == nxt.y) {
                const start = Math.min(pt.x, nxt.x)
                const end = Math.max(pt.x, nxt.x)
                seg = new ManhattanWireSegment({ direction: Direction.Horiz, at: pt.y, start: start, end: end });
            } else {
                console.log("Wire segment is neither horizontal nor vertical");
                return;
            }
            this.segments.push(seg)
            pt = nxt;
        }
    }
}
class Schematic {
    constructor(size) {
        this.size = size || new Point(1600, 800);
        this.wires = new Map();      // Map<Number, Wire>
        this.instances = new Map();  // Map<Number, Instance>
        this.entities = new Map();   // Map<Number, Entity>

        // Running count of added instances, for naming. 
        this.num_instances = 0;
        // Running count of added schematic entities. Serves as their "primary key" in each Map.
        this.num_entities = 0;
    }
    // Add an element to the `entities` mapping. Returns its ID if successful. 
    addEntity = entity => {
        // Set the entity's ID
        const entityId = this.num_entities;
        entity.obj.entityId = entityId;

        // Increment the number of entities even if we fail, hopefully breaking out of failure cases. 
        this.num_entities += 1;

        if (this.entities.has(entityId)) {
            console.log(`Entity ${entityId} already exists. Cannot add ${entity}.`);
            return null;
        }
        // Success, add it to the map and return the ID. 
        this.entities.set(entityId, entity);
        return entityId;
    }
    // Add a wire to the schematic. Returns its ID if successful, or `null` if not. 
    addWire = wire => { /* Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this.addEntity(new Entity({ kind: EntityKind.Wire, obj: wire }));
        // And if successful, add it to our `wires` mapping.
        if (entityId !== null) {
            this.wires.set(entityId, wire);
        }
    }
    // Remove a wire from the schematic.
    removeWire = wire => {
        this.wires.delete(wire.entityId);
        this.entities.delete(wire.entityId);

        // Remove the wire's drawing
        if (wire.drawing) {
            two.remove(wire.drawing);
        }
    }
    // Add an instance to the schematic.
    addInstance = instance => { /* Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this.addEntity(new Entity({ kind: EntityKind.Instance, obj: instance }));
        // Increment our instance count, whether we succeeded or not.
        this.num_instances += 1;
        if (entityId !== null) {
            this.instances.set(entityId, instance);
        }
        // FIXME: need to also add Entities per Port and Label
    }
    removeInstance = instance => {
        if (!this.instances.has(instance.entityId)) {
            console.log("Instance not found in schematic");
            return;
        }
        this.instances.delete(instance.entityId);
        this.entities.delete(instance.entityId);
        // FIXME: delete its port and label entities too 

        // Remove the instance's drawing
        if (instance.drawing) {
            two.remove(instance.drawing);
        }
    }
    // Draw all elements in the schematic.
    draw = () => {
        for (let [key, instance] of this.instances) {
            instance.draw();
        }
        for (let [key, wire] of this.wires) {
            wire.draw();
        }
    }
}


/// # Enumerated UI Modes 
/// 
const UiModes = Object.freeze({
    Idle: Symbol("Idle"),
    AddInstance: Symbol("AddInstance"),
    MoveInstance: Symbol("MoveInstance"),
    EditLabel: Symbol("EditLabel"),
    DrawWire: Symbol("DrawWire"),
});

// Enumerate Update Types 
// Stored in the playback queue, e.g. for undo/redo. 
const UpdateTypes = Object.freeze({
    AddInstance: Symbol("AddInstance"),
    MoveInstance: Symbol("MoveInstance"),
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
        // Kind of the last instance added. Serves as the default when adding new ones. 
        this.lastPrimEnum = PrimitiveEnum.Nmos;

        // The last instance added. Serves as the default when adding new ones.
        // This initial value is never drawn; it just serves as the initial default instance.
        this.lastInstance = new Instance({
            name: "",
            of: "",
            kind: PrimitiveEnum.Nmos,
            loc: new Point(0, 0),
            orientation: Orientation.default(),
        });

        // The currently selected entity (instance, wire, port, etc.)
        this.selected_entity = null;
        // Track the mouse position at all times. 
        // Initializes to the center of the `two` canvas.
        this.mouse_pos = new Point(two.width / 2, two.height / 2);
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
// core attributes `schematic` and `ui_state` are largely "data only". 
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
export class SchEditor {
    constructor(platform) {
        // Initialize the editor state 
        this.platform = platform;
        this.schematic = null;
        this.ui_state = new UiState();

        // Perform all of our one-time startup activity, binding events, etc.

        // window.addEventListener('resize', e => console.log(e));
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
        const svgContent = serialize(this.schematic);
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
                const schematic = Importer.import(msg.body);
                // FIXME: error handling here
                return this.loadSchematic(schematic);
            }
            // Messages designed to sent *from* us, to the platform.
            case 'change': {
                console.log("Invalid message from platform to editor:");
                console.log(msg);
            }
            default: {
                console.log("UNKNOWN MESSAGE");
                console.log(msg);
            }
        }
    }
    // Load a new schematic into the editor.
    newSchematic = () => {
        const schematic = new Schematic();
        this.loadSchematic(schematic);
    }
    // Load `schematic` into the UI and draw it.
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
        // Get the outline size from the Schematic
        const x = this.schematic.size.x;
        const y = this.schematic.size.y;

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
    // Go to the "UI Idle" state, in which nothing is moving, being drawn, or really doing anything. 
    goUiIdle = () => {
        this.ui_state.mode = UiModes.Idle;
    }
    // Handle keystrokes. 
    handleKey = (e) => {
        // Always go back to idle mode on escape.
        if (e.key === Keys.Escape) {
            this.deselect();
            return this.goUiIdle();
        }
        // In the update Text Labels state, forward all other keystrokes to its handler. 
        if (this.ui_state.mode === UiModes.EditLabel) {
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
        if (!this.ui_state.selected_entity) { return; }
        const entity = this.ui_state.selected_entity;
        switch (entity.kind) {
            case EntityKind.Instance: {
                // Delete the selected Instance
                this.deselect();
                this.schematic.removeInstance(entity.obj);
                return this.goUiIdle();
            }
            case EntityKind.Wire: {
                // Delete the selected Instance
                this.deselect();
                this.schematic.removeWire(entity.obj);
                return this.goUiIdle();
            }
            case EntityKind.Label:
            case EntityKind.Port: return;
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
        // Check all Instance symbols / bodies
        for (let [key, instance] of this.schematic.instances) {
            if (instance.hitTest(point)) {
                return new Entity({ kind: EntityKind.Instance, obj: instance });
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
        if (!this.ui_state.selected_entity) { return null; }
        return this.ui_state.selected_entity.obj;
    }
    // Make `entity` the selected, highlighted entity.
    select = entity => {
        this.deselect();
        this.ui_state.selected_entity = entity;
        entity.highlight();
    }
    // Deselect the highlighted entity, if any.
    deselect = () => {
        if (this.ui_state.selected_entity) {
            this.ui_state.selected_entity.unhighlight();
        }
        this.ui_state.selected_entity = null;
    }
    handleMouseDown = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.ui_state.mouse_pos);

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.Idle: {
                // In idle mode, if we clicked on something, react and update our UI state.
                if (!whatd_we_hit) {
                    return this.deselect(); // Hit nothing, do nothing. 
                }
                // Select the clicked-on entity

                // And react based on its type. 
                switch (whatd_we_hit.kind) {
                    case EntityKind.Instance: {
                        // Start moving the instance.
                        this.ui_state.mode = UiModes.MoveInstance;
                        return this.select(whatd_we_hit);
                    }
                    case EntityKind.Label: {
                        this.ui_state.mode = UiModes.EditLabel;
                        return this.select(whatd_we_hit);
                    }
                    case EntityKind.Port: {
                        // FIXME: start drawing a wire.
                        break;
                    }
                    case EntityKind.Wire: {
                        return this.select(whatd_we_hit);
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
        const whatd_we_hit = this.whatdWeHit(this.ui_state.mouse_pos);

        // And react to the current UI mode.
        switch (this.ui_state.mode) {
            case UiModes.DrawWire: return this.addWireVertex();
            case UiModes.AddInstance: return this.commitInstance();
            case UiModes.MoveInstance: return this.goUiIdle();
            default: return;
        }
    }
    // // Handle mouse click events.
    // handleClick = e => {
    // }
    // Handle double-click events.
    handleDoubleClick = e => {
        // Hit test, finding which element was clicked on.
        const whatd_we_hit = this.whatdWeHit(this.ui_state.mouse_pos);

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
            case UiModes.MoveInstance: this.updateMoveInstance(); break;
            default: break;
        }
    }
    // Enter the `DrawWire` mode, and create the tentative Wire. 
    startDrawWire = () => {
        this.ui_state.mode = UiModes.DrawWire;
        const start = nearestOnGrid(this.ui_state.mouse_pos);
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
        const landing = this.nearestManhattan(this.ui_state.mouse_pos, prev_point);

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
        const landing = this.nearestManhattan(this.ui_state.mouse_pos, prev_point);
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
    // Create a new Instance
    createInstance = () => {
        // Create the provisional `Instance`.
        // Use the last one added as a template.
        const lastInstance = this.ui_state.lastInstance;
        const { kind } = lastInstance;
        const prim = PrimitiveMap.get(kind) || PrimitiveEnum.Nmos;

        // FIXME: switch these based on `kind`
        const name = `${prim.defaultNamePrefix}${this.schematic.num_instances}`;
        const of = prim.defaultOf;
        const instance = new Instance({
            name: name,
            of: of,
            kind: kind,
            loc: this.ui_state.mouse_pos,
            orientation: lastInstance.orientation.copy(),
        });
        this.ui_state.lastInstance = instance;
        return instance;
    }
    // Start adding a new Instance
    startAddInstance = () => {
        // Create the provisional `Instance`. Note it is *not* added to the schematic yet.
        const instance = this.createInstance();

        // Update our UI state.
        this.ui_state.mode = UiModes.AddInstance;
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
        const snapped = nearestOnGrid(this.ui_state.mouse_pos);
        // Set the location of both the instance and its drawing 
        instance.loc = snapped;
        instance.draw();
    }
    // Update the rendering of an in-progress instance move.
    updateMoveInstance = () => {
        const instance = this.selected_object();
        // Snap to our grid
        const snapped = nearestOnGrid(this.ui_state.mouse_pos);
        // Set the location of both the instance and its drawing 
        instance.loc = snapped;
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

        if (e.key === Keys.Backspace) {
            // Subtract last character of the label
            return label.update(label.text.slice(0, label.text.length - 1));
        }
        // Filter down to "identifier characters": letters, numbers, and underscores.
        if (e.key.length !== 1 || e.key === Keys.Space) {
            return;
        }

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();

        // Add the character to the label.
        return label.update(label.text + e.key);
    }
    // Flip the selected instance, if one is selected.
    flipSelected = dir => {
        if (!this.ui_state.selected_entity) { return; }
        if (this.ui_state.selected_entity.kind !== EntityKind.Instance) { return; }

        // We have a selected Instance. Flip it. 
        const instance = this.selected_object();

        // Always flip vertically. Horizontal flips are comprised of a vertical flip and two rotations.
        instance.orientation.reflected = !instance.orientation.reflected;
        if (dir === Direction.Horiz) {
            instance.orientation.rotation = nextRotation(nextRotation(instance.orientation.rotation));
        }
        instance.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
    // Rotate the selected instance by 90 degrees, if one is selected.
    rotateSelected = () => {
        if (!this.ui_state.selected_entity) { return; }
        if (this.ui_state.selected_entity.kind !== EntityKind.Instance) { return; }

        // We have a selected Instance. Rotate it. 
        const instance = this.selected_object();
        instance.orientation.rotation = nextRotation(instance.orientation.rotation);
        instance.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
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
    <rect id="hdl21-schematic-grid" width="100%" height="100%" fill="url(#grid)" stroke="gray" stroke-width="1"/>

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
    for (let [key, inst] of schematic.instances) {
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
        rv += `<text visibility="hidden" class="hdl21-wire-name">FIXME</text> \n`;
        rv += `</g> \n`;
        return rv;
    }

    // Write each wire to the SVG.
    for (let [key, wire] of schematic.wires) {
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

const nextRotation = rotation => {
    switch (rotation) {
        case Rotation.R0:
            return Rotation.R90;
        case Rotation.R90:
            return Rotation.R180;
        case Rotation.R180:
            return Rotation.R270;
        case Rotation.R270:
            return Rotation.R0;
    }
}

// Instance Orientation 
// including reflection & rotation 
// 
class Orientation {
    constructor(reflected, rotation) {
        this.reflected = reflected; // Boolean
        this.rotation = rotation;   // Rotation 
    }
    // Create a copy of this orientation.
    copy = () => new Orientation(this.reflected, this.rotation);
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

// # Schematic SVG Importer
// 
export class Importer {
    constructor() {
        this.schematic = new Schematic();
        this.otherSvgElements = [];
    }
    // Import a schematic SVG string to a `Schematic`. 
    // Creates an Importer and recursively traverses the SVG tree.
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
        const svgTag = symbolGroup.properties.class;
        const prim = PrimitiveTags.get(svgTag);
        if (!prim) {
            console.log(svgTag);
            throw new Error(`Unknown symbol type: ${svgTag}`);
        }
        const kind = prim.enumval;

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
        this.schematic.addInstance(instance);
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
        this.schematic.addWire(wire);
    };
    // Add an element to the "other", non-schematic elements list.
    addOtherSvgElement = svgElement => {
        console.log(`other elem:`);
        console.log(svgElement);
        this.otherSvgElements.push(svgElement);
    };
}
