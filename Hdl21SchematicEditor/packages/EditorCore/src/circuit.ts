/*
# Circuit

Circuits data model extracted from schematics. 

Circuit data is often stored as JSON-encoded text embedded in an SVG schematic. 
Thus it is crucial that the data model here matches that of any paired importer.
*/

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
