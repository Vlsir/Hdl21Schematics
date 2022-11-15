//
// # Circuit
//
// Circuits data model extracted from schematics.
//
// Circuit data is often stored as JSON-encoded text embedded in an SVG schematic.
// Thus it is crucial that the data model here matches that of any paired importer.
//

// # Signal/ Port Direction
// Including the `INTERNAL` variant for internal Signals
export enum PortDir {
  INTERNAL = "INTERNAL",
  INPUT = "INPUT",
  OUTPUT = "OUTPUT",
  INOUT = "INOUT",
}

// # Circuit Signal
export interface Signal {
  name: string;
  portdir: PortDir;
}

// # Instance Connection
// A (port, signal) pair, specified in string names.
export interface Connection {
  portname: string; // Port Name
  signame: string; // Connected Signal Name
}

// # Circuit Instance
export interface Instance {
  name: string; // Instance Name
  of: string; // Instance-Of Code-String
  conns: Array<Connection>; // Connections
}

// # Circuit
// The circuit-level content of a Schematic. This might alternatively be called a "Module".
// Consists of collections of Signals, Instances of circuit elements, and connections there-between.
export interface Circuit {
  name: string; // Circuit Name
  prelude: string; // Code Prelude
  signals: Array<Signal>; // Signals List
  instances: Array<Instance>; // Instances List
}
