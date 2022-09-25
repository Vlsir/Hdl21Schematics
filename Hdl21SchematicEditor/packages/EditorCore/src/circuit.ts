/*
# Circuit

Circuits extracted from schematics, 
and the action-code to extract them.
*/

// Local imports
import { Point, point } from "./point";
import { Schematic, Wire } from "./schematicdata";
import { OrientationMatrix, matrix } from "./orientation";
import { PortKind, PortMap } from "./portsymbol";
import { PrimitiveMap } from "./primitive";
import { exhaust } from "./errors";
import { calcSegments, ManhattanSegment, hitTestSegment } from "./manhattan";

// Wrapper for hit-testing the wire segments for connectivity
const hitTestSegmentConnects = (seg: ManhattanSegment, pt: Point): boolean => {
  // Hit test the segment with *zero* tolerance,
  // i.e. points must land exactly on it.
  return hitTestSegment(seg, pt, 0);
};

/* Schematic Signal/ Port Direction
Including the `INTERNAL` variant for internal Signals*/
export enum PortDir {
  INTERNAL = "INTERNAL",
  INPUT = "INPUT",
  OUTPUT = "OUTPUT",
  INOUT = "INOUT",
}

export interface Signal {
  name: string;
  portdir: PortDir;
}

/* Connection to an Instance Port */
export interface Connection {
  portname: string; // Port Name
  signame: string; // Connected Signal Name
}

/* Circuit Instance */
export interface Instance {
  name: string; // Instance Name
  of: string; // Instance-Of Code-String
  conns: Array<Connection>; // Connections
}

/* Circuit Module */
export interface Circuit {
  name: string; // Circuit Name
  prelude: string; // Code Prelude
  signals: Array<Signal>; // Signals List
  instances: Array<Instance>; // Instances List
}

// Conversion-Time wrapper around a `Wire` and its `segments`.
interface ConverterWire {
  wire: Wire;
  segments: Array<ManhattanSegment>;
}

// # Intra-Conversion Signal
// Includes the result `circuit.Signal`, plus the `schematic.Wires` which constitute it.
class ConverterSignal {
  signal: Signal;
  wires: Array<ConverterWire> = [];
  constructor(signal: Signal) {
    this.signal = signal;
  }
  static new(name: string, wire: ConverterWire): ConverterSignal {
    const convSig = new ConverterSignal({
      name: name,
      portdir: PortDir.INTERNAL,
    });
    convSig.wires.push(wire);
    return convSig;
  }
  // Boolean indication of wheter `pt` intersects with any of the Signal's Wires
  intersectsPoint(pt: Point): boolean {
    for (let convWire of this.wires) {
      if (wireIntersectsPoint(convWire, pt)) {
        return true;
      }
    }
    return false;
  }
}

/* # Schematic to Circuit Converter State */
export class SchematicToCircuitConverter {
  sch: Schematic; // The input `Schematic`

  // Internal conversion state
  num_signals: number = 0; // Number of signals created, for naming, for now.
  convWires: Map<number, ConverterWire> = new Map();
  convSignals: Map<string, ConverterSignal> = new Map();
  instances: Map<string, Instance> = new Map();

  constructor(sch: Schematic) {
    this.sch = sch;
    // FIXME! creating Signal names here, ignoring the SVG ones, for now
    this.num_signals = 0;
  }

  convert(): Circuit {
    this.collect_signals();
    this.collect_ports();
    this.collect_instances();
    return this.make_circuit();
  }
  make_circuit(): Circuit {
    // Rejigger the internally stored `Signals` and `Instances` into `Circuit` form
    const signals = Array.from(this.convSignals.values()).map(
      (convSig) => convSig.signal
    );
    const instances = Array.from(this.instances.values());

    // Create and return the `Circuit`
    return {
      name: this.sch.name,
      prelude: this.sch.prelude,
      signals,
      instances,
    };
  }

  collect_signals() {
    // Merge all the schematic's Wires into Signals
    // Start by creating integer "pointers" to them in a dict
    this.sch.wires.forEach((wire, index) => {
      const segments = calcSegments(wire.points);
      if (!segments) {
        throw this.fail(`Internal error: invalid wire ${wire}`);
      }
      this.convWires.set(index, { wire, segments });
    });

    // Inspect each, merging into any intersecting Wires
    while (this.convWires.size > 0) {
      // Pop a random item from `this.convWires`
      let [key, wire] = this.convWires.entries().next().value;
      //   let wire = this.convWires.get(key);
      if (!wire) {
        throw this.fail(`Internal error: no key ${key} in ${this.convWires}`);
      }
      this.convWires.delete(key);

      // FIXME! naming
      const convSignal = ConverterSignal.new(`${this.num_signals}`, wire);
      let pending: Array<ConverterWire> = [wire];

      // While there are any items in the "pending connected" queue, keep merging into `convSignal`.
      while (pending.length > 0) {
        wire = pending.pop();
        if (!wire) {
          throw this.fail(`Internal error: no wires in ${pending}`);
        }
        for (let othernum of this.convWires.keys()) {
          const otherwire = this.convWires.get(othernum);
          if (!otherwire) {
            throw this.fail(
              `Internal error: no key ${othernum} in ${this.convWires}`
            );
          }
          // If the `other` wire intersects with this one, merge them.
          if (wireIntersectsWire(wire, otherwire)) {
            this.convWires.delete(othernum);
            pending.push(otherwire);
            convSignal.wires.push(otherwire);
          }
        }
      }
      this.convSignals.set(convSignal.signal.name, convSignal);
      this.num_signals += 1;
    }
  }
  collect_ports() {
    /* Collect port-annotation objects and update their connected Signals. */

    // Get the port-annotation objects
    const schematic_ports = this.sch.ports;

    for (let port_instance of this.sch.ports) {
      const portsym = PortMap.get(port_instance.kind);
      if (!portsym) {
        throw this.fail(`Unknown portsym ${port_instance.kind}`);
      }

      // Transform the portsym-referenced port location to the instance's location
      const mat = matrix.fromOrientation(port_instance.orientation);
      const instance_port_loc = transform(
        point(0, 0), // Each PortSymbol's "instance port location" is implicitly its origin.
        mat,
        port_instance.loc
      );

      // Check if the port intersects with any of the existing signals
      const intersectingConvSignal =
        this.intersectingConvSignal(instance_port_loc);
      if (!intersectingConvSignal) {
        const msg = `Port ${port_instance.name} does not intersect with any existing signal`;
        throw this.fail(msg);
      }
      const signal = intersectingConvSignal.signal;
      // Set the intersecting Signal's port direction
      signal.portdir = portdir(portsym.kind);

      // Rename the intersecting signal to the port's name
      // Also replace its key in the `this.circuit.signals` dict
      this.convSignals.delete(signal.name);
      signal.name = port_instance.name;
      this.convSignals.set(signal.name, intersectingConvSignal);
    }
  }
  collect_instances() {
    // Add each instance
    for (let sch_instance of this.sch.instances) {
      const primitive = PrimitiveMap.get(sch_instance.kind);
      if (!primitive) {
        throw this.fail(`Unknown primitive ${sch_instance.kind}`);
      }
      let conns: Array<Connection> = [];
      for (let prim_port of primitive.ports) {
        // Transform the primitive-referenced port location to the instance's location
        const mat = matrix.fromOrientation(sch_instance.orientation);
        const instance_port_loc = transform(
          prim_port.loc,
          mat,
          sch_instance.loc
        );
        // Check if the port intersects with any of the existing signals
        const intersecting_signal =
          this.intersectingConvSignal(instance_port_loc);
        if (!intersecting_signal) {
          const msg = `Port ${prim_port.name} on Instance ${sch_instance} does not intersect with any existing signal`;
          throw this.fail(msg);
        }
        conns.push({
          portname: prim_port.name,
          signame: intersecting_signal.signal.name,
        });
      }
      let circuit_instance = {
        name: sch_instance.name,
        of: sch_instance.of,
        conns,
      };
      this.instances.set(circuit_instance.name, circuit_instance);
    }
  }

  /* Get the Signal at location `loc`.
  Returns None if no Signal is found.
  Note calls to `intersecting_signal` are invalid until `circuit.signals` is populated. */
  intersectingConvSignal(loc: Point): ConverterSignal | null {
    for (let convSignal of this.convSignals.values()) {
      if (convSignal.intersectsPoint(loc)) {
        return convSignal;
      }
    }
    return null;
  }

  fail(msg: string): Error {
    return new Error(msg);
  }
}

/* Apply the `OrientationMatrix` transformation to `pt`.
  Computes `pt * mat + loc`. */
export function transform(
  pt: Point,
  mat: OrientationMatrix,
  loc: Point
): Point {
  return point(
    mat.a * pt.x + mat.c * pt.y + loc.x,
    mat.b * pt.x + mat.d * pt.y + loc.y
  );
}

/* Extract a circuit from a schematic.
  Raises a `RuntimeError` if the schematic cannot be converted to a valid `Circuit`. */
export function to_circuit(sch: Schematic): Circuit {
  return new SchematicToCircuitConverter(sch).convert();
}

function wireIntersectsPoint(convWire: ConverterWire, pt: Point): boolean {
  return !!convWire.segments.some((seg) => hitTestSegmentConnects(seg, pt));
}

function wireIntersectsWire(
  wire: ConverterWire,
  other: ConverterWire
): boolean {
  return !!(
    wire.wire.points.some((pt) => wireIntersectsPoint(other, pt)) ||
    other.wire.points.some((pt) => wireIntersectsPoint(wire, pt))
  );
}

// Get the `PortDir` for a port-symbol kind
function portdir(kind: PortKind): PortDir {
  switch (kind) {
    case PortKind.Input:
      return PortDir.INPUT;
    case PortKind.Output:
      return PortDir.OUTPUT;
    case PortKind.Inout:
      return PortDir.INOUT;
    default:
      throw exhaust(kind); // Exhaustiveness check
  }
}
