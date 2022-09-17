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
  keyboardShortcut: string; // Keyboard key for insertion in the editor
}

// Map from enumerated keys to `Primitive` objects.
export const PrimitiveMap: Map<PrimitiveKind, Primitive> = new Map();

// Map from SVG class tags to `Primitive` objects.
export const PrimitiveTags: Map<string, Primitive> = new Map();

// Map from (keyboard) key to `Primitive` objects.
export const PrimitiveKeyboardShortcuts: Map<string, Primitive> = new Map();

// Add `Primitive`s to the module-scope mappings.
function add(prims: Array<Primitive>) {
  for (let prim of prims) {
    PrimitiveMap.set(prim.kind, prim);
    PrimitiveTags.set(prim.svgTag, prim);
    PrimitiveKeyboardShortcuts.set(prim.keyboardShortcut, prim);
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
      `<path d="M -10 60 L -10 80 L 5 70 Z" class="hdl21-symbols" />`,
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
    keyboardShortcut: "n",
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
      `<path d="M -15 20 L -15 40 L -30 30 Z" class="hdl21-symbols" />`,
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
    keyboardShortcut: "p",
  },
  {
    kind: PrimitiveKind.Res,
    svgTag: "hdl21::primitives::res",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "r",
    defaultOf: "r()",
    keyboardShortcut: "r",
  },
  {
    kind: PrimitiveKind.Res3,
    svgTag: "hdl21::primitives::res3",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
      // Bulk connection
      `<path d="M -5 50 L -20 50" class="hdl21-symbols" />`,
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
    keyboardShortcut: "R",
  },
  {
    kind: PrimitiveKind.Cap,
    svgTag: "hdl21::primitives::cap",
    svgLines: [
      `<path d="M 0 0 L 0 40" class="hdl21-symbols" />`,
      `<path d="M -20 40 L 20 40" class="hdl21-symbols" />`,
      `<path d="M -20 60 L 20 60" class="hdl21-symbols" />`,
      `<path d="M 0 60 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "c",
    defaultOf: "c()",
    keyboardShortcut: "c",
  },
  {
    kind: PrimitiveKind.Cap3,
    svgTag: "hdl21::primitives::cap3",
    svgLines: [
      // All the parts of the two-terminal cap
      `<path d="M 0 0 L 0 40" class="hdl21-symbols" />`,
      `<path d="M -20 40 L 20 40" class="hdl21-symbols" />`,
      `<path d="M -20 60 L 20 60" class="hdl21-symbols" />`,
      `<path d="M 0 60 L 0 100" class="hdl21-symbols" />`,
      // Bulk connection
      `<path d="M -40 50 L -25 50" class="hdl21-symbols" />`,
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
    keyboardShortcut: "C",
  },
  {
    kind: PrimitiveKind.Ind,
    svgTag: "hdl21::primitives::ind",
    svgLines: [
      // FIXME: just a box, until sorting out the curvy stuff
      `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "l",
    defaultOf: "l()",
    keyboardShortcut: "l",
  },
  {
    kind: PrimitiveKind.Ind3,
    svgTag: "hdl21::primitives::ind3",
    svgLines: [
      // FIXME: just a box, until sorting out the curvy stuff
      `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
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
    keyboardShortcut: "L",
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
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "v",
    defaultOf: "v()",
    keyboardShortcut: "v",
  },
  {
    kind: PrimitiveKind.Vsource4,
    svgTag: "hdl21::primitives::vsource4",
    svgLines: [
      // All the parts of the two-terminal `vsource`
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M 0 32 L 0 52" class="hdl21-symbols" />`,
      `<path d="M -10 42 L 10 42" class="hdl21-symbols" />`,
      `<path d="M -10 65 L 10 65" class="hdl21-symbols" />`,
      // Control terminal connections
      `<path d="M -40 25 L -20 25" class="hdl21-symbols" />`,
      `<path d="M -40 75 L -20 75" class="hdl21-symbols" />`,
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
    keyboardShortcut: "V",
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
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "i",
    defaultOf: "i()",
    keyboardShortcut: "i",
  },
  {
    kind: PrimitiveKind.Isource4,
    svgTag: "hdl21::primitives::isource4",
    svgLines: [
      // All the parts of the two-terminal `isource`
      `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
      `<path d="M 0 35 L 0 65" class="hdl21-symbols" />`,
      `<path d="M 0 35 L -10 47 L 10 47 Z" class="hdl21-symbols" />`,
      // Control terminal connections
      `<path d="M -40 25 L -20 25" class="hdl21-symbols" />`,
      `<path d="M -40 75 L -20 75" class="hdl21-symbols" />`,
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
    keyboardShortcut: "I",
  },
  {
    kind: PrimitiveKind.Diode,
    svgTag: "hdl21::primitives::diode",
    svgLines: [
      // The triangle
      `<path d="M 0 70 L -20 35 L 20 35 Z" class="hdl21-symbols" />`,
      // Horizontal line
      `<path d="M -20 65 L 20 65" class="hdl21-symbols" />`,
      // Two port connections
      `<path d="M 0 0 L 0 35" class="hdl21-symbols" />`,
      `<path d="M 0 65 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: new Point(0, 0) },
      { name: "n", loc: new Point(0, 100) },
    ],
    nameloc: new Point(10, 0),
    ofloc: new Point(10, 90),
    defaultNamePrefix: "d",
    defaultOf: "d()",
    keyboardShortcut: "d",
  },
  {
    kind: PrimitiveKind.Npn,
    svgTag: "hdl21::primitives::npn",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 20 L -30 40 L -30 60 L 0 80 L 0 100" class="hdl21-symbols" />`,
      // Base vertical bar
      `<path d="M -30 80 L -30 20" class="hdl21-symbols" />`,
      // Base connection
      `<path d="M -30 50 L -50 50" class="hdl21-symbols" />`,
      // The triangle
      `<path d="M -20 78 L -10 62 L 0 80 Z" class="hdl21-symbols" />`,
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
    keyboardShortcut: "q",
  },
  {
    kind: PrimitiveKind.Pnp,
    svgTag: "hdl21::primitives::pnp",
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 20 L -30 40 L -30 60 L 0 80 L 0 100" class="hdl21-symbols" />`,
      // Base vertical bar
      `<path d="M -30 80 L -30 20" class="hdl21-symbols" />`,
      // Base connection
      `<path d="M -30 50 L -50 50" class="hdl21-symbols" />`,
      // The triangle
      `<path d="M -20 22 L -10 38 L -30 40 Z" class="hdl21-symbols" />`,
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
    keyboardShortcut: "Q",
  },
]);
