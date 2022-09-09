/*
 * # Port Symbols
 *
 * The definitions of the elements instantiable as schematic `Port`s.
 */

// Local Imports
import { Point } from "./point";

// # Enumerated Port Kinds
//
// The list of enumerated port types.
// Serves as the keys in the `PortMap` mapping,
// and the key stored on each `Port` object.
//
export enum PortKind {
  Input = "INPUT",
  Output = "OUTPUT",
  Inout = "INOUT",
}

// # Port Element
//
// The types of things which schematics can instantiate.
// Ports include the symbol drawing as an SVG string,
// plus metadata indicating their port names and locations.
//
export class PortSymbol {
  kind: PortKind;
  svgTag: string;
  svgStr: string;
  nameloc: Point;
  constructor(kind: PortKind, svgTag: string, svgStr: string, nameloc: Point) {
    this.kind = kind; // PortKind
    this.svgTag = svgTag; // string, svg class-name
    this.svgStr = svgStr; // SVG-valued string
    this.nameloc = nameloc; // Point
  }
  // Create a new Port, and add it to module-scope mappings.
  static add(portsym: PortSymbol) {
    PortMap.set(portsym.kind, portsym);
    PortTags.set(portsym.svgTag, portsym);
  }
}
// Map from enumerated keys to `Port` objects.
export const PortMap = new Map();
// Map from tags to `Port` objects.
export const PortTags = new Map();

PortSymbol.add({
  kind: PortKind.Input,
  svgTag: "hdl21::primitives::input",
  svgStr: `
    <g class="hdl21::primitives::input">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M 30 10 L 50 10" class="hdl21-symbols" />
        <circle cx="50" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  //   ports: [new Port({ name: "FIXME", loc: new Point(50, 10) })],
  nameloc: new Point(10, -15),
});
PortSymbol.add({
  kind: PortKind.Output,
  svgTag: "hdl21::primitives::output",
  svgStr: `
    <g class="hdl21::primitives::output">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L 0 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  //   ports: [new Port({ name: "FIXME", loc: new Point(-20, 10) })],
  nameloc: new Point(10, -15),
});
PortSymbol.add({
  kind: PortKind.Inout,
  svgTag: "hdl21::primitives::inout",
  svgStr: `
    <g class="hdl21::primitives::inout">
        <path d="M 0 0 L -10 10 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L -10 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  //   ports: [new Port({ name: "FIXME", loc: new Point(-20, 10) })],
  nameloc: new Point(10, -15),
});
