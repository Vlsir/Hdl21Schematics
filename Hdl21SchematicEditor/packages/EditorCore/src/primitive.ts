/*
 * # Primitives
 *
 * The instantiable primitive elements of a schematic.
 */

// Local Imports
import { Point } from "./point";

// # Enumerated Primitive Kinds
//
// The list of enumerated primitives element types.
// Serves as the keys in the `PrimitiveMap` mapping,
// and the key stored on each `Instance` object.
//
export enum PrimitiveKind {
  Nmos = "Nmos",
  Pmos = "Pmos",
  Vsource2 = "Vsource2",
  Vsource4 = "Vsource4",
  Isource2 = "Isource2",
  Isource4 = "Isource4",
  Res2 = "Res2",
  Res3 = "Res3",
  Cap2 = "Cap2",
  Cap3 = "Cap3",
  Ind2 = "Ind2",
  Ind3 = "Ind3",
  Diode = "Diode",
  Npn = "Npn",
  Pnp = "Pnp",
  // FIXME: break out the Port types
  Input = "Input",
  Output = "Output",
  Inout = "Inout",
}

// # Primitive Instance Port
export class Port {
  name: string;
  loc: Point;
  constructor(name: string, loc: Point) {
    this.name = name; // string
    this.loc = loc; // Point
  }
}

// # Primitive Element
//
// The types of things which schematics can instantiate.
// Primitives include the symbol drawing as an SVG string,
// plus metadata indicating their port names and locations.
//
class Primitive {
  kind: PrimitiveKind;
  svgTag: string;
  svgStr: string;
  ports: Array<Port>;
  nameloc: Point;
  ofloc: Point;
  defaultNamePrefix: string;
  defaultOf: string;

  constructor(
    kind: PrimitiveKind,
    svgTag: string,
    svgStr: string,
    ports: Array<Port>,
    nameloc: Point,
    ofloc: Point,
    defaultNamePrefix: string | null,
    defaultOf: string | null
  ) {
    this.kind = kind; // PrimitiveKind
    this.svgTag = svgTag; // string, svg class-name
    this.svgStr = svgStr; // SVG-valued string
    this.ports = ports; // [Port]
    this.nameloc = nameloc; // Point
    this.ofloc = ofloc; // Point
    this.defaultNamePrefix = defaultNamePrefix || "x"; // string
    this.defaultOf = defaultOf || "of()"; // string
  }
  // Create a new Primitive, and add it to module-scope mappings.
  static add(prim: Primitive) {
    PrimitiveMap.set(prim.kind, prim);
    PrimitiveTags.set(prim.svgTag, prim);
  }
}
// Map from enumerated keys to `Primitive` objects.
export const PrimitiveMap = new Map();
// Map from tags to `Primitive` objects.
export const PrimitiveTags = new Map();

Primitive.add({
  kind: PrimitiveKind.Nmos,
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
    { name: "d", loc: new Point(0, 0) },
    { name: "g", loc: new Point(70, 40) },
    { name: "s", loc: new Point(0, 80) },
    { name: "b", loc: new Point(-20, 40) },
  ],
  nameloc: new Point(10, 0),
  ofloc: new Point(10, 80),
  defaultNamePrefix: "n",
  defaultOf: "nmos()",
});
Primitive.add({
  kind: PrimitiveKind.Pmos,
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
    { name: "d", loc: new Point(0, 0) },
    { name: "g", loc: new Point(70, 40) },
    { name: "s", loc: new Point(0, 80) },
    { name: "b", loc: new Point(-20, 40) },
  ],
  nameloc: new Point(10, 0),
  ofloc: new Point(10, 80),
  defaultNamePrefix: "p",
  defaultOf: "pmos()",
});
Primitive.add({
  kind: PrimitiveKind.Input,
  svgTag: "hdl21::primitives::input",
  svgStr: `
    <g class="hdl21::primitives::input">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M 30 10 L 50 10" class="hdl21-symbols" />
        <circle cx="50" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  ports: [{ name: "FIXME", loc: new Point(50, 10) }],
  nameloc: new Point(10, -15),
  ofloc: new Point(10, 35),
  defaultNamePrefix: "i",
  defaultOf: "input()",
});
Primitive.add({
  kind: PrimitiveKind.Output,
  svgTag: "hdl21::primitives::output",
  svgStr: `
    <g class="hdl21::primitives::output">
        <path d="M 0 0 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L 0 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  ports: [{ name: "FIXME", loc: new Point(-20, 10) }],
  nameloc: new Point(10, -15),
  ofloc: new Point(10, 35),
  defaultNamePrefix: "o",
  defaultOf: "output()",
});
Primitive.add({
  kind: PrimitiveKind.Inout,
  svgTag: "hdl21::primitives::inout",
  svgStr: `
    <g class="hdl21::primitives::inout">
        <path d="M 0 0 L -10 10 L 0 20 L 20 20 L 30 10 L 20 0 Z" class="hdl21-symbols" />
        <path d="M -20 10 L -10 10" class="hdl21-symbols" />
        <circle cx="-20" cy="10" r="4" class="hdl21-instance-port" />
    </g>
    `,
  ports: [{ name: "FIXME", loc: new Point(-20, 10) }],
  nameloc: new Point(10, -15),
  ofloc: new Point(10, 35),
  defaultNamePrefix: "io",
  defaultOf: "inout()",
});
// FIXME: add all the other elements
