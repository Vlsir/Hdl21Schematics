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
  Res = "Res",
  Res3 = "Res3",
  Cap = "Cap",
  Cap3 = "Cap3",
  Ind = "Ind",
  Ind3 = "Ind3",
  Vsource = "Vsource",
  Vsource4 = "Vsource4",
  Isource = "Isource",
  Isource4 = "Isource4",
  Diode = "Diode",
  Npn = "Npn",
  Pnp = "Pnp",
}

// # Instance Port
export interface InstancePort {
  name: string;
  loc: Point;
}

// # Primitive Element
//
// The types of things which schematics can instantiate.
// Primitives include the symbol drawing as an SVG string,
// plus metadata indicating their port names and locations.
//
export interface Primitive {
  kind: PrimitiveKind;
  svgTag: string;
  svgLines: Array<string>;
  ports: Array<InstancePort>;
  nameloc: Point;
  ofloc: Point;
  defaultNamePrefix: string;
  defaultOf: string;
}

// Map from enumerated keys to `Primitive` objects.
export const PrimitiveMap: Map<PrimitiveKind, Primitive> = new Map();
// Map from SVG class tags to `Primitive` objects.
export const PrimitiveTags: Map<string, Primitive> = new Map();

// Add `Primitive`s to the module-scope mappings.
function add(prims: Array<Primitive>) {
  for (let prim of prims) {
    PrimitiveMap.set(prim.kind, prim);
    PrimitiveTags.set(prim.svgTag, prim);
  }
}

// Create the library of `Primitive`s.
add([
  {
    kind: PrimitiveKind.Nmos,
    svgTag: "hdl21::primitives::nmos",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 30 L -28 30 L -28 70 L 0 70 L 0 100" class="hdl21-symbols" />`,
      // Vertical gate bar
      `<path d="M -40 30 L -40 70" class="hdl21-symbols" />`,
      // Gate bar's horizontal extension
      `<path d="M -40 50 L -70 50" class="hdl21-symbols" />`,
      // Bulk connection
      `<path d="M 0 50 L 20 50" class="hdl21-symbols" />`,
      // The triangle
      `<path x="-10" y="60" d="M 0 0 L 0 20 L 15 10 Z" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "d", loc: new Point(0, 0) },
      { name: "g", loc: new Point(-70, 50) },
      { name: "s", loc: new Point(0, 100) },
      { name: "b", loc: new Point(20, 50) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
    defaultNamePrefix: "n",
    defaultOf: "nmos()",
  },
  {
    kind: PrimitiveKind.Pmos,
    svgTag: "hdl21::primitives::pmos",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 30 L -28 30 L -28 70 L 0 70 L 0 100" class="hdl21-symbols" />`,
      // Vertical gate bar
      `<path d="M -40 30 L -40 70" class="hdl21-symbols" />`,
      // Gate bar's horizontal extension
      `<path d="M -60 50 L -70 50" class="hdl21-symbols" />`,
      // Bulk connection
      `<path d="M 0 50 L 20 50" class="hdl21-symbols" />`,
      // The triangle
      `<path x="-15" y="20" d="M 0 0 L 0 20 L -15 10 Z" class="hdl21-symbols" />`,
      // The gate circle
      `<circle cx="-50" cy="50" r="8" fill="white" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "d", loc: new Point(0, 0) },
      { name: "g", loc: new Point(-70, 50) },
      { name: "s", loc: new Point(0, 100) },
      { name: "b", loc: new Point(20, 50) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 80),
    defaultNamePrefix: "p",
    defaultOf: "pmos()",
  },
  {
    kind: PrimitiveKind.Res,
    svgTag: "hdl21::primitives::res",
    svgLines: [
      `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "r",
    defaultOf: "r()",
  },
  {
    kind: PrimitiveKind.Res3,
    svgTag: "hdl21::primitives::res3",
    svgLines: [
      `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M -5 50 L -20 50" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-20" cy="50" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
      { name: "b", loc: new Point(-20, 50) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "res3",
    defaultOf: "res3()",
  },
  {
    kind: PrimitiveKind.Cap,
    svgTag: "hdl21::primitives::cap",
    svgLines: [
      `<path d="M 0 0 L 0 40" class="hdl21-symbols" />`,
      `<path d="M -20 40 L 20 40" class="hdl21-symbols" />`,
      `<path d="M -20 60 L 20 60" class="hdl21-symbols" />`,
      `<path d="M 0 60 L 0 100" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "c",
    defaultOf: "c()",
  },
  {
    kind: PrimitiveKind.Cap3,
    svgTag: "hdl21::primitives::cap3",
    svgLines: [
      `<path d="M 0 0 L 0 40" class="hdl21-symbols" />`,
      `<path d="M -20 40 L 20 40" class="hdl21-symbols" />`,
      `<path d="M -20 60 L 20 60" class="hdl21-symbols" />`,
      `<path d="M 0 60 L 0 100" class="hdl21-symbols" />`,
      `<path d="M -40 50 L -25 50" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-40" cy="50" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
      { name: "b", loc: new Point(-40, 50) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "cap3",
    defaultOf: "cap3()",
  },
  {
    kind: PrimitiveKind.Ind,
    svgTag: "hdl21::primitives::ind",
    svgLines: [
      `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "l",
    defaultOf: "l()",
  },
  {
    kind: PrimitiveKind.Ind3,
    svgTag: "hdl21::primitives::ind3",
    svgLines: [
      `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-20" cy="50" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
      { name: "b", loc: new Point(-20, 50) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "ind3",
    defaultOf: "ind3()",
  },

  {
    kind: PrimitiveKind.Vsource,
    svgTag: "hdl21::primitives::vsource",
    svgLines: [
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M 0 32 L 0 52" class="hdl21-symbols" />`,
      `<path d="M -10 42 L 10 42" class="hdl21-symbols" />`,
      `<path d="M -10 65 L 10 65" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "v",
    defaultOf: "v()",
  },
  {
    kind: PrimitiveKind.Vsource4,
    svgTag: "hdl21::primitives::vsource4",
    svgLines: [
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M 0 32 L 0 52" class="hdl21-symbols" />`,
      `<path d="M -10 42 L 10 42" class="hdl21-symbols" />`,
      `<path d="M -10 65 L 10 65" class="hdl21-symbols" />`,
      `<path d="M -40 25 L -20 25" class="hdl21-symbols" />`,
      `<path d="M -40 75 L -20 75" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-40" cy="25" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-40" cy="75" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
      { name: "cp", loc: new Point(-40, 25) },
      { name: "cn", loc: new Point(-40, 75) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "v4",
    defaultOf: "v4()",
  },

  {
    kind: PrimitiveKind.Isource,
    svgTag: "hdl21::primitives::isource",
    svgLines: [
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,

      `<path d="M 0 35 L 0 65" class="hdl21-symbols" />`,
      `<path d="M 0 35 L -10 47 L 10 47 Z" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "i",
    defaultOf: "i()",
  },
  {
    kind: PrimitiveKind.Isource4,
    svgTag: "hdl21::primitives::isource4",
    svgLines: [
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,

      `<path d="M 0 35 L 0 65" class="hdl21-symbols" />`,
      `<path d="M 0 35 L -10 47 L 10 47 Z" class="hdl21-symbols" />`,

      `<path d="M -40 25 L -20 25" class="hdl21-symbols" />`,
      `<path d="M -40 75 L -20 75" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-40" cy="25" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-40" cy="75" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
      { name: "cp", loc: new Point(-40, 25) },
      { name: "cn", loc: new Point(-40, 75) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "i4",
    defaultOf: "i4()",
  },
  {
    kind: PrimitiveKind.Diode,
    svgTag: "hdl21::primitives::diode",
    svgLines: [
      `<path d="M 0 70 L -20 35 L 20 35 Z" class="hdl21-symbols" />`,
      `<path d="M -20 65 L 20 65" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 35" class="hdl21-symbols" />`,
      `<path d="M 0 65 L 0 100" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "d",
    defaultOf: "d()",
  },
  {
    kind: PrimitiveKind.Npn,
    svgTag: "hdl21::primitives::npn",
    svgLines: [
      `<path d="M 0 0 L 0 20 L -30 40 L -30 60 L 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M -30 80 L -30 20" class="hdl21-symbols" />`,
      `<path d="M -30 50 L -50 50" class="hdl21-symbols" />`,
      `<path x="-10" y="68" transform="rotate(30)" d="M 0 0 L 0 20 L 15 10 L 0 0 Z" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-50" cy="50" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "c", loc: new Point(0, 0) },
      { name: "b", loc: new Point(-50, 50) },
      { name: "e", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "npn",
    defaultOf: "npn()",
  },
  {
    kind: PrimitiveKind.Pnp,
    svgTag: "hdl21::primitives::pnp",
    svgLines: [
      `<path d="M 0 0 L 0 20 L -30 40 L -30 60 L 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M -30 80 L -30 20" class="hdl21-symbols" />`,
      `<path d="M -30 50 L -50 50" class="hdl21-symbols" />`,
      `<path x="-25" y="22" transform="rotate(150)" d="M 0 0 L 0 20 L 15 10 L 0 0 Z" class="hdl21-symbols" />`,

      `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`,
      `<circle cx="-50" cy="50" r="4" class="hdl21-instance-port" />`,
      `<circle cx="0" cy="100" r="4" class="hdl21-instance-port" />`,
    ],
    ports: [
      { name: "c", loc: new Point(0, 0) },
      { name: "b", loc: new Point(-50, 50) },
      { name: "e", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "pnp",
    defaultOf: "pnp()",
  },
]);
