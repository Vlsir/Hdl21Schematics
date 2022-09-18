import Two from "two.js";

// Local Imports 
import { Point } from "./point";
import { Direction } from "./direction";
import { PrimitiveMap } from "./primitive";
import { PortMap } from "./portsymbol";
import * as schdata from "./schematic";
import { Rotation } from "./schematic";
import { wireStyle, symbolStyle } from "./style";
import { Label, LabelKind } from "./label";
import { EntityKind } from "./entity";
import { theCanvas } from "./canvas";


// Module-level state of the two.js canvas
const two = theCanvas.two;


// FIXME! fill these guys in
export class InstancePort { }
export class Dot {
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


// # Schematic Entity 
// 
// All the methods for interacting with a schematic entity.
// "Implementers" include Symbols, Ports, and WireSegments. 
// 
export class Entity {
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



// # Schematic Instance 
// 
// Combination of the Instance data and drawn visualization. 
// 
export class Instance {
    constructor(data) {
        // Instance Data
        this.data = data; // schdata.Instance

        this.nameLabel = null;
        this.ofLabel = null;

        // Number, unique ID. Not a constructor argument. 
        this.entityId = null;
        // Drawing data, set during calls to `draw()`.
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
            theCanvas.instanceLayer.remove(this.drawing);
            this.drawing = null;
        }

        // Load the symbol as a Two.Group, wrapping the content in <svg> elements.
        let symbolSvgStr = "<svg>" + primitive.svgLines.join();
        for (let port of primitive.ports) {
            symbolSvgStr += `<circle cx="${port.loc.x}" cy="${port.loc.y}" r="4" class="hdl21-instance-port" />`;
        }
        symbolSvgStr += "</svg>";
        const symbol = two.load(symbolSvgStr);
        traverseAndApply(symbol, symbolStyle);

        // Create the Instance's drawing-Group, including its symbol, names, and ports.
        this.drawing = new Two.Group();
        this.drawing.add(symbol);
        theCanvas.instanceLayer.add(this.drawing);

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
        this.nameLabel = Label.create({ text: this.data.name, kind: LabelKind.Name, loc: primitive.nameloc, parent: this });
        // this.nameLabel.draw();

        // Create and add the instance-of Label 
        this.ofLabel = Label.create({ text: this.data.of, kind: LabelKind.Of, loc: primitive.ofloc, parent: this });
        // this.ofLabel.draw();

        if (this.highlighted) { this.highlight(); }
    }
    // Boolean indication of whether `point` is inside the Instance's bounding box.
    hitTest = point => {
        const bbox = this.bbox;
        return point.x > bbox.left && point.x < bbox.right
            && point.y > bbox.top && point.y < bbox.bottom;

    }
    // Abort drawing an in-progress instance.
    abort = () => {
        if (this.drawing) { // Remove any existing drawing 
            theCanvas.instanceLayer.remove(this.drawing);
            this.drawing = null;
        }
    }
    // Update the string-value from a `Label`. 
    updateLabel = label => {
        const kind = label.kind;
        if (kind === LabelKind.Name) {
            this.data.name = label.text;
        } else if (kind === LabelKind.Of) {
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
export class SchPort {
    constructor(data) {
        this.data = data; // schdata.Port

        // Text port-name `Label`
        this.nameLabel = null;
        // Number, unique ID. Not a constructor argument. 
        this.entityId = null;
        // Drawing data, set during calls to `draw()`.
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
            theCanvas.instanceLayer.remove(this.drawing);
            this.drawing = null;
        }

        // Load the symbol as a Two.Group, wrapping the content in <svg> elements.
        let symbolSvgStr = "<svg>" + portsymbol.svgLines.join();
        symbolSvgStr += `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`;
        symbolSvgStr += "</svg>";
        const symbol = two.load(symbolSvgStr);
        traverseAndApply(symbol, symbolStyle);

        // Create the Instance's drawing-Group, including its symbol, names, and ports.
        this.drawing = new Two.Group();
        this.drawing.add(symbol);
        theCanvas.instanceLayer.add(this.drawing);

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
        this.nameLabel = Label.create({ text: this.data.name, kind: LabelKind.Name, loc: portsymbol.nameloc, parent: this });

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
            theCanvas.instanceLayer.remove(this.drawing);
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

// # Manhattan Wire Segment
// Runs either horizontally or vertically in direction `dir`,
// at a constant coordinate `at` and between `start` and `end`.
export class ManhattanWireSegment {
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

export class Wire {
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
            theCanvas.wireLayer.remove(this.drawing);
            this.drawing = null;
        }
        // Flatten coordinates into the form [x1, y1, x2, y2, ...]
        let coords = [];
        for (let point of this.points) {
            coords.push(point.x, point.y);
        }
        // Create the drawing 
        this.drawing = two.makePath(...coords);
        theCanvas.wireLayer.add(this.drawing);
        // Set the wire style 
        wireStyle(this.drawing);

        if (this.highlighted) { this.highlight(); }
    }
    // Abort drawing an in-progress wire.
    abort = () => {
        theCanvas.wireLayer.remove(this.drawing);
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
export class Schematic {
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
    _insertEntity = entity => {
        // Set the entity's ID, if it doesn't have one already. 
        // We get re-inserted entities from the undo stack, so we need to check for this.
        if (!entity.obj.entityId) {
            entity.obj.entityId = this.num_entities;
            // Increment the number of entities even if we fail, hopefully breaking out of failure cases. 
            this.num_entities += 1;
        }
        const { entityId } = entity.obj;
        console.log(entity);
        console.log(this.entities);

        if (this.entities.has(entityId)) {
            console.log(`Entity ${entityId} already exists. Cannot add ${entity}.`);
            return null;
        }
        // Success, add it to the map and return the ID. 
        this.entities.set(entityId, entity);
        return entityId;
    }
    // Add an entity to the schematic. Largely dispatches according to the entity's kind.
    addEntity = entity => { /* Entity => void */
        // const entityId = this._insertEntity(entity);
        // if (entityId === null) { return; }

        switch (entity.kind) {
            // Delete-able entities
            case EntityKind.SchPort: return this.addPort(entity.obj);
            case EntityKind.Dot: return this.addDot(entity.obj);
            case EntityKind.Wire: return this.addWire(entity.obj);
            case EntityKind.Instance: return this.addInstance(entity.obj);
            // Non-delete-able "child" entities
            case EntityKind.Label:
            case EntityKind.InstancePort: {
                console.log("Not a deletable entity");
                console.log(entity);
                return;
            }
        }
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
        const entityId = this._insertEntity(new Entity({ kind: EntityKind.SchPort, obj: port }));
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
            theCanvas.instanceLayer.remove(port.drawing);
        }
    }
    // Add a wire to the schematic. Returns its ID if successful, or `null` if not. 
    addWire = wire => { /* Wire => Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this._insertEntity(new Entity({ kind: EntityKind.Wire, obj: wire }));
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
            theCanvas.wireLayer.remove(wire.drawing);
        }
    }
    // Add an instance to the schematic.
    addInstance = instance => { /* Instance => Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this._insertEntity(new Entity({ kind: EntityKind.Instance, obj: instance }));
        // Increment our instance count, whether we succeeded or not.
        this.num_instances += 1;
        if (entityId !== null) {
            this.instances.set(entityId, instance);
        }
        // FIXME: need to also add Entities per Port and Label
    }
    removeInstance = instance => {
        console.log(`Removing instance`);
        console.log(instance);
        if (!this.instances.has(instance.entityId)) {
            console.log("Instance not found in schematic");
            return;
        }
        this.instances.delete(instance.entityId);
        this.entities.delete(instance.entityId);
        // FIXME: delete its port and label entities too 
        console.log(this.entities);

        // Remove the instance's drawing
        if (instance.drawing) {
            theCanvas.instanceLayer.remove(instance.drawing);
        }
    }
    // Add an dot to the schematic.
    addDot = dot => { /* Dot => Number | null */
        // Attempt to add it to our `entities` mapping.
        const entityId = this._insertEntity(new Entity({ kind: EntityKind.Dot, obj: dot }));
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
            theCanvas.dotLayer.remove(dot.drawing);
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
