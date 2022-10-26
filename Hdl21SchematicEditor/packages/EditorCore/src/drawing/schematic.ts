// Local Imports
import { Entity, EntityKind } from "./entity";
import { Wire } from "./wire";
import { Instance, SchPort } from "./instance";
import { Dot } from "./dot";
import { Point, point } from "../point";
import * as schdata from "../schematicdata";
import { exhaust } from "../errors";
import { SchEditor } from "../editor";

export class Schematic {
  constructor(
    public editor: SchEditor, // Reference to the parent Editor
    public size: Point = point(1600, 800), // Size/ outline
    public prelude: string = "", // Code prelude string
    public otherSvgElements: Array<string> = [] // List of other SVG elements, stored as strings. FIXME: kinda?
  ) {}

  // Internal data stores
  wires = new Map(); // Map<Number, Wire>
  instances = new Map(); // Map<Number, Instance>
  ports = new Map(); // Map<Number, SchPort>
  dots = new Map(); // Map<Number, Dot>
  entities = new Map(); // Map<Number, Entity>

  // Running count of added instances, for naming.
  num_instances = 0;
  num_ports = 0;
  // Running count of added schematic entities. Serves as their "primary key" in each Map.
  num_entities = 0;

  // Create a (drawn) `Schematic` from the abstract data model
  static fromData(editor: SchEditor, schData: schdata.Schematic): Schematic {
    const sch = new Schematic(
      editor,
      schData.size,
      schData.prelude,
      [] // FIXME! otherSvgElements
    );

    // Add all instances
    for (let instData of schData.instances) {
      sch.addInstance(Instance.create(instData));
    }
    // Add all ports
    for (let portData of schData.ports) {
      sch.addPort(SchPort.create(portData));
    }
    // Add all wires. Note we strip the sole `points` field out of these.
    for (let wireData of schData.wires) {
      sch.addWire(Wire.create(wireData.points));
    }
    // Add all dots
    for (let dotLoc of schData.dots) {
      sch.addDot(Dot.create(dotLoc));
    }
    return sch;
  }
  // Export to the abstract data model
  toData = () => {
    /* Schematic => schdata.Schematic */
    const schData = new schdata.Schematic();
    schData.name = ""; // FIXME
    schData.size = structuredClone(this.size);
    schData.prelude = structuredClone(this.prelude);
    schData.otherSvgElements = []; // FIXME!
    for (let [id, inst] of this.instances) {
      schData.instances.push(inst.data);
    }
    for (let [id, port] of this.ports) {
      schData.ports.push(port.data);
    }
    for (let [id, wire] of this.wires) {
      schData.wires.push({ points: wire.points });
    }
    for (let [id, dot] of this.dots) {
      schData.dots.push(dot.loc);
    }
    return schData;
  };
  // Add an element to the `entities` mapping. Returns its ID if successful.
  _insertEntity = (entity: Entity) => {
    // Set the entity's ID, if it doesn't have one already.
    // We get re-inserted entities from the undo stack, so we need to check for this.
    if (!entity.entityId) {
      entity.entityId = this.num_entities;
      // Increment the number of entities even if we fail, hopefully breaking out of failure cases.
      this.num_entities += 1;
    }
    const { entityId } = entity;

    if (this.entities.has(entityId)) {
      console.log(`Entity ${entityId} already exists. Cannot add ${entity}.`);
      return null;
    }
    // Success, add it to the map and return the ID.
    this.entities.set(entityId, entity);
    return entityId;
  };
  // Add an entity to the schematic. Largely dispatches according to the entity's kind.
  addEntity = (entity: Entity): void => {
    /* Entity => void */
    // const entityId = this._insertEntity(entity);
    // if (entityId === null) { return; }

    const { entityKind } = entity;
    switch (entityKind) {
      // Delete-able entities
      case EntityKind.SchPort:
        return this.addPort(entity);
      case EntityKind.Dot:
        return this.addDot(entity);
      case EntityKind.Wire:
        return this.addWire(entity);
      case EntityKind.Instance:
        return this.addInstance(entity);
      // Non directly add-able "child" entities
      case EntityKind.Label:
      case EntityKind.InstancePort:
        return;
      default:
        throw exhaust(entityKind); // Exhaustiveness check
    }
  };
  // Remove an entity from the schematic. Largely dispatches according to the entity's kind.
  removeEntity = (entity: Entity) => {
    const { entityKind } = entity;
    switch (entityKind) {
      // Delete-able entities
      case EntityKind.SchPort:
        return this.removePort(entity);
      case EntityKind.Dot:
        return this.removeDot(entity);
      case EntityKind.Wire:
        return this.removeWire(entity);
      case EntityKind.Instance:
        return this.removeInstance(entity);
      // Non-delete-able "child" entities
      case EntityKind.Label:
      case EntityKind.InstancePort:
        return;
      default:
        throw exhaust(entityKind); // Exhaustiveness check
    }
  };
  // Add a port to the schematic.
  addPort = (port: SchPort) => {
    /* Port => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(port);
    // Increment our port count, whether we succeeded or not.
    this.num_ports += 1;
    if (entityId !== null) {
      this.ports.set(entityId, port);
    }
    // FIXME: need to also add Entities per Port and Label
  };
  removePort = (port: SchPort) => {
    if (!this.ports.has(port.entityId)) {
      console.log("Port not found in schematic");
      return;
    }
    this.ports.delete(port.entityId);
    this.entities.delete(port.entityId);
    // FIXME: delete its port and label entities too

    // Remove the port's drawing
    port.removeDrawing();
  };
  // Add a wire to the schematic. Returns its ID if successful, or `null` if not.
  addWire = (wire: Wire) => {
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(wire);
    // And if successful, add it to our `wires` mapping.
    if (entityId !== null) {
      this.wires.set(entityId, wire);
    }
  };
  // Remove a wire from the schematic.
  removeWire = (wire: Wire) => {
    this.wires.delete(wire.entityId);
    this.entities.delete(wire.entityId);

    // Remove the wire's drawing
    if (wire.drawing) {
      wire.drawing?.remove();
    }
  };
  // Add an instance to the schematic.
  addInstance = (instance: Instance) => {
    /* Instance => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(instance);
    // Increment our instance count, whether we succeeded or not.
    this.num_instances += 1;
    if (entityId !== null) {
      this.instances.set(entityId, instance);
    }
    // FIXME: need to also add Entities per Port and Label
  };
  removeInstance = (instance: Instance) => {
    if (!this.instances.has(instance.entityId)) {
      console.log("Instance not found in schematic");
      return;
    }
    this.instances.delete(instance.entityId);
    this.entities.delete(instance.entityId);

    // Remove the instance's drawing
    instance.removeDrawing();
  };
  // Add an dot to the schematic.
  addDot = (dot: Dot) => {
    /* Dot => Number | null */
    // Attempt to add it to our `entities` mapping.
    const entityId = this._insertEntity(dot);
    if (entityId !== null) {
      this.dots.set(entityId, dot);
    }
  };
  removeDot = (dot: Dot) => {
    if (!this.dots.has(dot.entityId)) {
      console.log("Dot not found in schematic");
      return;
    }
    this.dots.delete(dot.entityId);
    this.entities.delete(dot.entityId);

    // Remove the dot's drawing
    if (dot.drawing) {
      dot.drawing?.remove();
    }
  };
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
  };
}
