/*
 * # Hdl21 Schematics Editor
 * 
 * Essentially the entirety of the schematic GUI, drawing logic, saving and loading logic. 
 */

import Two from 'two.js';

// Local Imports 
import { Point } from "./point";
import { PrimitiveMap, PrimitiveKind } from "./primitive";
import { PortMap } from "./portsymbol";
import { Importer } from "./importer";
import { Exporter } from "./exporter";
import * as schdata from "./schematic";


// FIXME! fill these guys in
class InstancePort { }
class Dot {
    constructor(loc) {
        this.loc = loc; // Point
    }
    draw = () => { }
}

// Recursively traverse a node with a list of `children`, 
// applying `fn` to each node.
const traverseAndApply = (node, fn) => {
    fn(node);
    if (node.children) {
        node.children.forEach(child => traverseAndApply(child, fn));
    }
}

// Apply the `hdl21-wire` styling in two.js terms
const wireStyle = path => { /* Two.Path => void */
    path.visible = true;
    path.closed = false;
    path.noFill();
    path.stroke = 'blue';
    path.linewidth = 10;
    path.cap = 'round';
    path.join = 'round';
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

// Apply the `hdl21-labels` styling in two.js terms
const labelStyle = textElem => { /* Two.Text => void */
    textElem.alignment = 'left';
    textElem.family = 'Comic Sans MS';
    textElem.style = 'heavy';
    textElem.size = 16;
}


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


// Enumerated Kinds of Schematic Entities
const EntityKind = Object.freeze({
    Instance: Symbol("Instance"),
    InstancePort: Symbol("InstancePort"),
    SchPort: Symbol("SchPort"),
    Label: Symbol("Label"),
    Wire: Symbol("Wire"),
    Dot: Symbol("Dot"),
});

// # Schematic Entity 
// 
// All the methods for interacting with a schematic entity.
// "Implementers" include Symbols, Ports, and WireSegments. 
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
        labelStyle(textElem);
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
    constructor(data) {
        // Instance Data
        this.data = data; // schdata.Instance

        this.nameLabel = null;
        this.ofLabel = null;

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
        const primitive = PrimitiveMap.get(this.data.kind);
        if (!primitive) {
            console.log(`No primitive for kind ${this.data.kind}`);
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
        if (this.data.orientation.reflected) {
            this.drawing.scale = new Two.Vector(1, -1);
        }
        // Apply rotation. Note two.js applies rotation *clockwise*, 
        // hence the negation of 90 and 270 degrees. 
        const radianRotation = () => {
            switch (this.data.orientation.rotation) {
                case Rotation.R0: return 0;
                case Rotation.R90: return -Math.PI / 2;
                case Rotation.R180: return Math.PI;
                case Rotation.R270: return Math.PI / 2;
            }
        }
        this.drawing.rotation = radianRotation();
        this.drawing.translation.set(this.data.loc.x, this.data.loc.y);

        // Set the bounding box for hit testing.
        // Note this must come *after* the drawing is added to the scene.
        this.bbox = symbol.getBoundingClientRect();

        // Create and add the instance-name Label
        this.nameLabel = new Label({ text: this.data.name, kind: LabelKind.Name, loc: primitive.nameloc, parent: this });
        this.nameLabel.draw();

        // Create and add the instance-of Label 
        this.ofLabel = new Label({ text: this.data.of, kind: LabelKind.Of, loc: primitive.ofloc, parent: this });
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
            this.data.name = label.text;
        } else if (label.kind === LabelKind.Of) {
            this.data.of = label.text;
        } else {
            console.log("Unknown label kind");
        }
    }
}

// # Schematic Port 
// 
// An instance-like object with a drawing and location, 
// which annotates a net as being externally accessible.
// 
class SchPort {
    constructor(data) {
        this.data = data; // schdata.Port

        // Text port-name `Label`
        this.nameLabel = null;
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
        return [this.nameLabel];
    }
    // Create and draw the Instance's `drawing`. 
    draw = () => {
        const portsymbol = PortMap.get(this.data.kind);
        if (!portsymbol) {
            console.log(`No portsymbol for kind ${this.data.kind}`);
            return;
        }
        if (this.drawing) { // Remove any existing drawing 
            two.remove(this.drawing);
            this.drawing = null;
        }

        // Load the symbol as a Two.Group. 
        // Note we apply the styling and wrap the content in <svg> elements.
        const symbolSvgStr = /*schematicStyle +*/ "<svg>" + portsymbol.svgStr + "</svg>";
        const symbol = two.load(symbolSvgStr);
        traverseAndApply(symbol, symbolStyle);
        two.add(symbol);

        // Create the Instance's drawing-Group, including its symbol, names, and ports.
        this.drawing = two.makeGroup();
        this.drawing.add(symbol);

        // Apply our vertical flip if necessary, via a two-dimensional `scale`-ing.
        this.drawing.scale = 1;
        if (this.data.orientation.reflected) {
            this.drawing.scale = new Two.Vector(1, -1);
        }
        // Apply rotation. Note two.js applies rotation *clockwise*, 
        // hence the negation of 90 and 270 degrees. 
        const radianRotation = () => {
            switch (this.data.orientation.rotation) {
                case Rotation.R0: return 0;
                case Rotation.R90: return -Math.PI / 2;
                case Rotation.R180: return Math.PI;
                case Rotation.R270: return Math.PI / 2;
            }
        }
        this.drawing.rotation = radianRotation();
        this.drawing.translation.set(this.data.loc.x, this.data.loc.y);

        // Set the bounding box for hit testing.
        // Note this must come *after* the drawing is added to the scene.
        this.bbox = symbol.getBoundingClientRect();

        // Create and add the port-name Label
        this.nameLabel = new Label({ text: this.data.name, kind: LabelKind.Name, loc: portsymbol.nameloc, parent: this });
        this.nameLabel.draw();

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
            this.data.name = label.text;
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
        this.drawing = two.makePath(...coords);
        // Set the wire style 
        wireStyle(this.drawing);

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

        // Internal data stores
        this.wires = new Map();      // Map<Number, Wire>
        this.instances = new Map();  // Map<Number, Instance>
        this.ports = new Map();      // Map<Number, SchPort>
        this.dots = new Map();       // Map<Number, Dot>
        this.entities = new Map();   // Map<Number, Entity>

        // Running count of added instances, for naming. 
        this.num_instances = 0;
        this.num_ports = 0;
        // Running count of added schematic entities. Serves as their "primary key" in each Map.
        this.num_entities = 0;
    }
    // Create a (drawn) `Schematic` from the abstract data model 
    static fromData(schData) /* schdata.Schematic => Schematic */ {
        const sch = new Schematic(schData.size);

        // Add all instances 
        for (let instData of schData.instances) {
            sch.addInstance(new Instance(instData));
        }
        // Add all ports
        for (let portData of schData.ports) {
            sch.addPort(new SchPort(portData));
        }
        // Add all wires. Note we strip the sole `points` field out of these. 
        for (let wireData of schData.wires) {
            sch.addWire(new Wire(wireData.points));
        }
        // Add all dots
        for (let dotLoc of schData.dots) {
            sch.addDot(new Dot(dotLoc));
        }
        return sch;
    }
    // Export to the abstract data model
    toData = () => { /* Schematic => schdata.Schematic */
        const schData = new schdata.Schematic("", this.size);
        for (let [id, inst] of this.instances) {
            schData.instances.push(inst.data);
        }
        for (let [id, port] of this.ports) {
            schData.ports.push(port.data);
        }
        for (let [id, wire] of this.wires) {
            schData.wires.push(new schdata.Wire(wire.points));
        }
        for (let [id, dot] of this.dots) {
            schData.dots.push(dot.loc);
        }
        return schData;
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
    // Remove an entity from the schematic. Largely dispatches according to the entity's kind.
    removeEntity = entity => { /* Entity => void */
        switch (entity.kind) {
            // Delete-able entities
            case EntityKind.SchPort: return this.removePort(entity.obj);
            case EntityKind.Dot: return this.removeDot(entity.obj);
            case EntityKind.Wire: return this.removeWire(entity.obj);
            case EntityKind.Instance: return this.removeInstance(entity.obj);
            // Non-delete-able "child" entities
            case EntityKind.Label:
            case EntityKind.InstancePort: {
                console.log("Not a deletable entity");
                console.log(entity);
                return;
            }
        }
    }
    // Add an port to the schematic.
    addPort = port => { /* Port => Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this.addEntity(new Entity({ kind: EntityKind.SchPort, obj: port }));
        // Increment our port count, whether we succeeded or not.
        this.num_ports += 1;
        if (entityId !== null) {
            this.ports.set(entityId, port);
        }
        // FIXME: need to also add Entities per Port and Label
    }
    removePort = port => {
        if (!this.ports.has(port.entityId)) {
            console.log("Port not found in schematic");
            return;
        }
        this.ports.delete(port.entityId);
        this.entities.delete(port.entityId);
        // FIXME: delete its port and label entities too 

        // Remove the port's drawing
        if (port.drawing) {
            two.remove(port.drawing);
        }
    }
    // Add a wire to the schematic. Returns its ID if successful, or `null` if not. 
    addWire = wire => { /* Wire => Number | null */
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
    addInstance = instance => { /* Instance => Number | null */
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
    // Add an dot to the schematic.
    addDot = dot => { /* Dot => Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this.addEntity(new Entity({ kind: EntityKind.Dot, obj: dot }));
        if (entityId !== null) {
            this.dots.set(entityId, dot);
        }
    }
    removeDot = dot => {
        if (!this.dots.has(dot.entityId)) {
            console.log("Dot not found in schematic");
            return;
        }
        this.dots.delete(dot.entityId);
        this.entities.delete(dot.entityId);

        // Remove the dot's drawing
        if (dot.drawing) {
            two.remove(dot.drawing);
        }
    }
    // Draw all elements in the schematic.
    draw = () => {
        for (let [key, instance] of this.instances) {
            instance.draw();
        }
        for (let [key, port] of this.ports) {
            port.draw();
        }
        for (let [key, wire] of this.wires) {
            wire.draw();
        }
        for (let [key, dot] of this.dots) {
            dot.draw();
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

        // The last instance added. Serves as the default when adding new ones.
        // This initial value is never drawn; it just serves as the initial default instance.
        this.lastInstanceData = {
            name: "",
            of: "",
            kind: PrimitiveKind.Nmos,
            loc: new Point(0, 0),
            orientation: schdata.Orientation.default(),
        };

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
class SchEditor {
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
                console.log("Invalid message from platform to editor:");
                console.log(msg);
            }
            default: {
                console.log("UNKNOWN MESSAGE");
                console.log(msg);
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
                    case EntityKind.SchPort:
                    case EntityKind.Instance: {
                        // Start moving the instance.
                        this.ui_state.mode = UiModes.MoveInstance;
                        return this.select(whatd_we_hit);
                    }
                    case EntityKind.Label: {
                        this.ui_state.mode = UiModes.EditLabel;
                        return this.select(whatd_we_hit);
                    }
                    case EntityKind.Wire: {
                        return this.select(whatd_we_hit);
                    }
                    case EntityKind.InstancePort: {
                        // FIXME: start drawing a wire.
                        break;
                    }
                    case EntityKind.Dot:
                    default: {
                        break;
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
        const { lastInstanceData } = this.ui_state;
        const { kind } = lastInstanceData;
        const prim = PrimitiveMap.get(kind) || PrimitiveKind.Nmos;

        // FIXME: switch these based on `kind`
        const name = `${prim.defaultNamePrefix}${this.schematic.num_instances}`;
        const of = prim.defaultOf;
        const newInstanceData = {
            name: name,
            of: of,
            kind: kind,
            loc: this.ui_state.mouse_pos,
            orientation: lastInstanceData.orientation.copy(),
        };
        this.ui_state.lastInstanceData = newInstanceData;
        const newInstance = new Instance(newInstanceData);
        return newInstance;
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
        instance.data.loc = snapped;
        instance.draw();
    }
    // Update the rendering of an in-progress instance move.
    updateMoveInstance = () => {
        const instance = this.selected_object();
        // Snap to our grid
        const snapped = nearestOnGrid(this.ui_state.mouse_pos);
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
        const { kind } = this.ui_state.selected_entity;
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
        if (!this.ui_state.selected_entity) { return; }
        const { kind } = this.ui_state.selected_entity;
        if (!(kind === EntityKind.Instance || kind === EntityKind.SchPort)) { return; }

        // We have a selected Instance. Rotate it. 
        const obj = this.selected_object();
        obj.data.orientation.rotation = nextRotation(obj.data.orientation.rotation);
        obj.draw();

        // Notify the platform that the schematic has changed.
        this.sendChangeMessage();
    }
}


// FIXME! these are the "JavaScript versions" of the TypeScript `Rotation` enum. 
// Just how they play together is TBD.
// For now, this relies on the string values being equal! Don't change them!
// 
// Enumerated Rotations 
// in increments of 90 degrees
const Rotation = Object.freeze({
    R0: "R0",
    R90: "R90",
    R180: "R180",
    R270: "R270",
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


// The singleton `SchEditor`, and our entrypoint to start it up.
let theEditor = null;
export function start(platform) { /* Platform => void */
    if (theEditor) { return; }
    theEditor = new SchEditor(platform);
}
