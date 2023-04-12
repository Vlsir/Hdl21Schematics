//
// # Circuit Extractor
//
// Converts a `Schematic` to the `Circuit` it represents.
//

import { Ok, Err, Result } from "ts-results";

// Local imports
import { Circuit, Instance, Signal, Connection, PortDir } from "./circuit";
import {
  Point,
  Schematic,
  Wire,
  OrientationMatrix,
  matrix,
  PortKind,
  calcSegments,
  ManhattanSegment,
  hitTestSegment,
} from "../schematic";
import { exhaust } from "../errors";

// Extract the `Circuit` from a `Schematic`.
// Returns an `Err` if the schematic cannot be converted to a valid `Circuit`.
export function extractCircuit(sch: Schematic): Result<Circuit, string> {
  return new SchematicToCircuitConverter(sch).convert();
}
// Get a JSON-encoded string representation of the `Circuit` extracted from a `Schematic`.
// Returns an `Err` if the schematic cannot be converted to a valid `Circuit`,
// or if the circuit cannot be converted to JSON.
export function toCircuitJson(sch: Schematic): Result<string, string> {
  // Extract the circuit, and return an error if it fails.
  const circuit = extractCircuit(sch);
  if (circuit.err) {
    return circuit;
  }

  // JSON encoding can apparently throw Errors.
  // It's not clear whether it ever would on `Circuit`, but nonetheless is wrapped here.
  try {
    const json = JSON.stringify(circuit.val);
    return Ok(json);
  } catch (error) {
    let message: string;
    if (error instanceof Error) message = error.message;
    else message = String(error);
    return Err(message);
  }
}

// Conversion-Time wrapper around a `Wire` and its `segments`.
interface ConverterWire {
  wire: Wire;
  segments: Array<ManhattanSegment>;
}

// # Intra-Conversion Signal
// Includes the result `circuit.Signal`, plus the `schematic.Wires` which constitute it.
class ConverterSignal {
  constructor(public signal: Signal) {}
  wires: Array<ConverterWire> = [];

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
class SchematicToCircuitConverter {
  // Sole constructor argument: the input `Schematic`
  constructor(readonly sch: Schematic) {}

  // Internal conversion state
  convWires: Map<number, ConverterWire> = new Map();
  convSignals: Map<string, ConverterSignal> = new Map();
  instances: Map<string, Instance> = new Map();
  // FIXME! creating Signal names here, ignoring the SVG ones, for now
  num_signals: number = 0; // Number of signals created, for naming, for now.

  // Primary instance-level entry point: convert `this.sch` to a `Circuit`
  convert = (): Result<Circuit, string> => {
    // Perform our main actions, collecting signals, ports, and instances
    const r = this.collect_signals()
      .andThen(this.collect_ports)
      .andThen(this.collect_instances);

    // Return early if any errors came back
    if (r.err) {
      return r;
    }

    // Rejigger the internally stored `Signals` and `Instances` into `Circuit` form
    return Ok(this.makeCircuit());
  };
  // Collect our internal state into a `Circuit`.
  // Only valid to be called after all "collect" methods have succeeded.
  makeCircuit = (): Circuit => {
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
  };

  collect_signals = (): Result<null, string> => {
    // Merge all the schematic's Wires into Signals
    // Start by creating integer "pointers" to them in a dict
    this.sch.wires.forEach((wire, index) => {
      const segments = calcSegments(wire.points);
      if (!segments) {
        return this.fail(`Internal error: invalid wire ${wire}`);
      }
      this.convWires.set(index, { wire, segments });
    });

    // Inspect each, merging into any intersecting Wires
    while (this.convWires.size > 0) {
      // Pop a random item from `this.convWires`
      let [key, wire] = this.convWires.entries().next().value;
      //   let wire = this.convWires.get(key);
      if (!wire) {
        return this.fail(`Internal error: no key ${key} in ${this.convWires}`);
      }
      this.convWires.delete(key);

      // FIXME! naming
      const convSignal = ConverterSignal.new(`${this.num_signals}`, wire);
      let pending: Array<ConverterWire> = [wire];

      // While there are any items in the "pending connected" queue, keep merging into `convSignal`.
      while (pending.length > 0) {
        wire = pending.pop();
        if (!wire) {
          return this.fail(`Internal error: no wires in ${pending}`);
        }
        for (let othernum of this.convWires.keys()) {
          const otherwire = this.convWires.get(othernum);
          if (!otherwire) {
            return this.fail(
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
    return Ok(null);
  };
  collect_ports = (): Result<null, string> => {
    /* Collect port-annotation objects and update their connected Signals. */

    for (let port_instance of this.sch.ports) {
      // Transform the portElement-referenced port location to the instance's location
      const mat = matrix.fromOrientation(port_instance.orientation);

      // FIXME: this seems (at the time of this writing) to be just making the identity transform on `port_instance.loc`
      // Check this, test it, remove it if so.
      const instance_port_loc = transform(
        Point.new(0, 0), // Each PortElement's "instance port location" is implicitly its origin.
        mat,
        port_instance.loc
      );

      // Check if the port intersects with any of the existing signals
      const intersectingConvSignal =
        this.intersectingConvSignal(instance_port_loc);
      if (!intersectingConvSignal) {
        const msg = `Port ${port_instance.name} does not intersect with any existing signal`;
        return this.fail(msg);
      }
      const signal = intersectingConvSignal.signal;
      // Set the intersecting Signal's port direction
      signal.portdir = portdir(port_instance.kind);

      // Rename the intersecting signal to the port's name
      // Also replace its key in the `this.circuit.signals` dict
      this.convSignals.delete(signal.name);
      signal.name = port_instance.name;
      this.convSignals.set(signal.name, intersectingConvSignal);
    }
    return Ok(null);
  };
  collect_instances = (): Result<null, string> => {
    // Add each instance
    for (let sch_instance of this.sch.instances) {
      const { element } = sch_instance;
      let conns: Array<Connection> = [];
      for (let elementPort of element.symbol.ports) {
        // Transform the element-referenced port location to the instance's location
        const mat = matrix.fromOrientation(sch_instance.orientation);
        const instance_port_loc = transform(
          elementPort.loc,
          mat,
          sch_instance.loc
        );
        // Check if the port intersects with any of the existing signals
        const intersecting_signal =
          this.intersectingConvSignal(instance_port_loc);
        if (!intersecting_signal) {
          const msg = `Port ${elementPort.name} on Instance ${sch_instance} does not intersect with any existing signal`;
          return this.fail(msg);
        }
        conns.push({
          portname: elementPort.name,
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
    return Ok(null);
  };

  /* Get the Signal at location `loc`.
    Returns None if no Signal is found.
    Note calls to `intersecting_signal` are invalid until `circuit.signals` is populated. */
  intersectingConvSignal = (loc: Point): ConverterSignal | null => {
    for (let convSignal of this.convSignals.values()) {
      if (convSignal.intersectsPoint(loc)) {
        return convSignal;
      }
    }
    return null;
  };
  // Error helper. Returns an `Err` with the given message.
  fail = (msg: string): Err<string> => {
    return Err(msg);
  };
}

// Apply the `OrientationMatrix` transformation to `pt`.
// Computes `pt * mat + loc`.
function transform(pt: Point, mat: OrientationMatrix, loc: Point): Point {
  return Point.new(
    mat.a * pt.x + mat.c * pt.y + loc.x,
    mat.b * pt.x + mat.d * pt.y + loc.y
  );
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
// Wrapper for hit-testing the wire segments for connectivity
const hitTestSegmentConnects = (seg: ManhattanSegment, pt: Point): boolean => {
  // Hit test the segment with *zero* tolerance, i.e. points must land exactly on it.
  return hitTestSegment(seg, pt, 0);
};
