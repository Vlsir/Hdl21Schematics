//
// # Primitives
//
// The instantiable circuit elements of a schematic.
//

// Local Imports
import { Point, point } from "./point";

// # Enumerated Primitive Kinds
//
// The list of enumerated primitives element types.
// Values are the Primitive's string name.
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

export const PrimitiveList: Array<Primitive> = [];

// Map from enumerated keys to `Primitive` objects.
export const PrimitiveMap: Map<PrimitiveKind, Primitive> = new Map();

// Map from SVG class tags to `Primitive` objects.
export const PrimitiveTags: Map<string, Primitive> = new Map();

// Map from (keyboard) key to `Primitive` objects.
export const PrimitiveKeyboardShortcuts: Map<string, Primitive> = new Map();

// Add `Primitive`s to the module-scope mappings.
function add(prim: Primitive) {
  // for (let prim of prims) {
  PrimitiveList.push(prim);
  PrimitiveMap.set(prim.kind, prim);
  PrimitiveTags.set(prim.svgTag, prim);
  PrimitiveKeyboardShortcuts.set(prim.keyboardShortcut, prim);
  // }
  return prim;
}

// Create the library of `Primitive`s.
export const Nmos = add({
  kind: PrimitiveKind.Nmos,
  svgTag: "nmos",
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
    { name: "d", loc: point.new(0, 0) },
    { name: "g", loc: point.new(-70, 50) },
    { name: "s", loc: point.new(0, 100) },
    { name: "b", loc: point.new(20, 50) },
  ],
  nameloc: point.new(10, 20),
  ofloc: point.new(10, 80),
  defaultNamePrefix: "n",
  defaultOf: "nmos()",
  keyboardShortcut: "n",
});
export const Pmos = add({
  kind: PrimitiveKind.Pmos,
  svgTag: "pmos",
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
    { name: "d", loc: point.new(0, 100) },
    { name: "g", loc: point.new(-70, 50) },
    { name: "s", loc: point.new(0, 0) },
    { name: "b", loc: point.new(20, 50) },
  ],
  nameloc: point.new(10, 20),
  ofloc: point.new(10, 80),
  defaultNamePrefix: "p",
  defaultOf: "pmos()",
  keyboardShortcut: "p",
});
export const Res = add({
  kind: PrimitiveKind.Res,
  svgTag: "res",
  svgLines: [
    // Main squiggly path
    `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "r",
  defaultOf: "r()",
  keyboardShortcut: "r",
});
export const Res3 = add({
  kind: PrimitiveKind.Res3,
  svgTag: "res3",
  svgLines: [
    // Main squiggly path
    `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
    // Bulk connection
    `<path d="M -5 50 L -20 50" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
    { name: "b", loc: point.new(-20, 50) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "res3",
  defaultOf: "res3()",
  keyboardShortcut: "R",
});
export const Cap = add({
  kind: PrimitiveKind.Cap,
  svgTag: "cap",
  svgLines: [
    `<path d="M 0 0 L 0 40" class="hdl21-symbols" />`,
    `<path d="M -20 40 L 20 40" class="hdl21-symbols" />`,
    `<path d="M -20 60 L 20 60" class="hdl21-symbols" />`,
    `<path d="M 0 60 L 0 100" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "c",
  defaultOf: "c()",
  keyboardShortcut: "c",
});
export const Cap3 = add({
  kind: PrimitiveKind.Cap3,
  svgTag: "cap3",
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
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
    { name: "b", loc: point.new(-40, 50) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "cap3",
  defaultOf: "cap3()",
  keyboardShortcut: "C",
});
export const Ind = add({
  kind: PrimitiveKind.Ind,
  svgTag: "ind",
  svgLines: [
    // FIXME: just a box, until sorting out the curvy stuff
    `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
    `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "l",
  defaultOf: "l()",
  keyboardShortcut: "l",
});
export const Ind3 = add({
  kind: PrimitiveKind.Ind3,
  svgTag: "ind3",
  svgLines: [
    // FIXME: just a box, until sorting out the curvy stuff
    `<rect x="-15" y="20" width="30" height="60" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
    `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
    { name: "b", loc: point.new(-20, 50) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "ind3",
  defaultOf: "ind3()",
  keyboardShortcut: "L",
});

export const Vsource = add({
  kind: PrimitiveKind.Vsource,
  svgTag: "vsource",
  svgLines: [
    `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
    `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
    `<path d="M 0 32 L 0 52" class="hdl21-symbols" />`,
    `<path d="M -10 42 L 10 42" class="hdl21-symbols" />`,
    `<path d="M -10 65 L 10 65" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "v",
  defaultOf: "v()",
  keyboardShortcut: "v",
});
export const Vsource4 = add({
  kind: PrimitiveKind.Vsource4,
  svgTag: "vsource4",
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
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
    { name: "cp", loc: point.new(-40, 25) },
    { name: "cn", loc: point.new(-40, 75) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "v4",
  defaultOf: "v4()",
  keyboardShortcut: "V",
});
export const Isource = add({
  kind: PrimitiveKind.Isource,
  svgTag: "isource",
  svgLines: [
    `<circle cx="0" cy="50" r="30" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
    `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
    `<path d="M 0 35 L 0 65" class="hdl21-symbols" />`,
    `<path d="M 0 35 L -10 47 L 10 47 Z" class="hdl21-symbols" />`,
  ],
  ports: [
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "i",
  defaultOf: "i()",
  keyboardShortcut: "i",
});
export const Isource4 = add({
  kind: PrimitiveKind.Isource4,
  svgTag: "isource4",
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
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
    { name: "cp", loc: point.new(-40, 25) },
    { name: "cn", loc: point.new(-40, 75) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "i4",
  defaultOf: "i4()",
  keyboardShortcut: "I",
});
export const Diode = add({
  kind: PrimitiveKind.Diode,
  svgTag: "diode",
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
    { name: "p", loc: point.new(0, 0) },
    { name: "n", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "d",
  defaultOf: "d()",
  keyboardShortcut: "d",
});
export const Npn = add({
  kind: PrimitiveKind.Npn,
  svgTag: "npn",
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
    { name: "c", loc: point.new(0, 0) },
    { name: "b", loc: point.new(-50, 50) },
    { name: "e", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "npn",
  defaultOf: "npn()",
  keyboardShortcut: "q",
});
export const Pnp = add({
  kind: PrimitiveKind.Pnp,
  svgTag: "pnp",
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
    { name: "c", loc: point.new(0, 0) },
    { name: "b", loc: point.new(-50, 50) },
    { name: "e", loc: point.new(0, 100) },
  ],
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "pnp",
  defaultOf: "pnp()",
  keyboardShortcut: "Q",
});

// The collection of primitives as a JS object
export const primitives = {
  Nmos,
  Pmos,
  Res,
  Res3,
  Cap,
  Cap3,
  Ind,
  Ind3,
  Vsource,
  Vsource4,
  Isource,
  Isource4,
  Diode,
  Npn,
  Pnp,
};

// Get a `Primitive` definition by its `PrimitiveKind`.
// This exclamation-mark non-null assertion is valid so long as
// we ensure that every valid `PrimitiveKind` is in the map.
export function get(kind: PrimitiveKind): Primitive {
  return PrimitiveMap.get(kind)!;
}

export const primitiveLib = {
  PrimitiveKind,
  primitives,
  list: PrimitiveList,
  kinds: PrimitiveMap,
  tags: PrimitiveTags,
  keyboardShortcuts: PrimitiveKeyboardShortcuts,
  get,
  default: () => get(PrimitiveKind.Nmos),
};
