/*
 * # SVG Definitions
 *
 * These enumerated class-names and ID-tags are used to identify schematic content in an SVG.
 * It is vital that they remain identical between any writer/ editor, and any reader.
 */

// Enumerated ID Tags used to identify Schematic content
export enum SchSvgIds {
  CIRCUIT = "hdl21-schematic-circuit",
  CIRCUIT_DEFS = "hdl21-schematic-circuit-defs",
  BACKGROUND_DEFS = "hdl21-schematic-background-defs",
  BACKGROUND = "hdl21-schematic-background",
  GRID_MINOR = "hdl21-grid-minor",
  GRID_MAJOR = "hdl21-grid-major",
  STYLE = "hdl21-schematic-style",
}

// Enumerated SVG Classes used to identify Schematic content
export enum SchSvgClasses {
  INSTANCE = "hdl21-instance",
  INSTANCE_NAME = "hdl21-instance-name",
  INSTANCE_OF = "hdl21-instance-of",
  INSTANCE_PORT = "hdl21-instance-port",
  WIRE = "hdl21-wire",
  WIRE_NAME = "hdl21-wire-name",
  PORT = "hdl21-port",
  PORT_NAME = "hdl21-port-name",
  DOT = "hdl21-dot",
}
