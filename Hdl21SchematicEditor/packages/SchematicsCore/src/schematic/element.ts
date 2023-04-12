//
// # Elements
//
// The instantiable circuit elements of a schematic.
//

// Local Imports
import { Point, point } from "./point";
import { Symbol } from "./symbol";

// # Enumerated Element Kinds
//
// The list of enumerated elements element types.
// Values are the Element's string name.
//
export enum ElementKind {
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

// # Element
//
// The types of things which schematics can instantiate.
// Elements include the symbol drawing as an SVG string,
// plus metadata indicating their port names and locations.
//
export interface Element {
  kind: ElementKind; // Enumerated element type
  svgTag: string; // SVG Tag
  symbol: Symbol; // Symbol
  nameloc: Point; // Location of name label
  ofloc: Point; // Location of "of" label
  defaultNamePrefix: string; // Initial, default name prefix when created
  defaultOf: string; // Initial, default "of" value when created
  keyboardShortcut: string; // Keyboard key for insertion in the editor
}

export const ElementList: Array<Element> = [];

// Map from enumerated keys to `Element` objects.
export const ElementMap: Map<ElementKind, Element> = new Map();

// Map from SVG class tags to `Element` objects.
export const ElementTags: Map<string, Element> = new Map();

// Map from (keyboard) key to `Element` objects.
export const ElementKeyboardShortcuts: Map<string, Element> = new Map();

// Add `Element`s to the module-scope mappings.
function add(element: Element) {
  ElementList.push(element);
  ElementMap.set(element.kind, element);
  ElementTags.set(element.svgTag, element);
  ElementKeyboardShortcuts.set(element.keyboardShortcut, element);
  // }
  return element;
}

// Create the library of `Element`s.
export const Nmos = add({
  kind: ElementKind.Nmos,
  svgTag: "nmos",
  symbol: {
    shapes: [],
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
  },
  nameloc: point.new(10, 20),
  ofloc: point.new(10, 80),
  defaultNamePrefix: "n",
  defaultOf: "Nmos()",
  keyboardShortcut: "n",
});
export const Pmos = add({
  kind: ElementKind.Pmos,
  svgTag: "pmos",
  symbol: {
    shapes: [],
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
  },
  nameloc: point.new(10, 20),
  ofloc: point.new(10, 80),
  defaultNamePrefix: "p",
  defaultOf: "Pmos()",
  keyboardShortcut: "p",
});
export const Res = add({
  kind: ElementKind.Res,
  svgTag: "res",
  symbol: {
    shapes: [],
    svgLines: [
      // Main squiggly path
      `<path d="M 0 0 L 0 20 L 30 30 L 0 40 L 30 50 L 0 60 L 30 70 L 0 80 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "r",
  defaultOf: "Res()",
  keyboardShortcut: "r",
});
export const Res3 = add({
  kind: ElementKind.Res3,
  svgTag: "res3",
  symbol: {
    shapes: [],
    svgLines: [
      // All of the two-terminal edition
      ...Res.symbol.svgLines,
      // Plus the bulk connection
      `<path d="M -5 50 L -20 50" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
      { name: "b", loc: point.new(-20, 50) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "res3",
  defaultOf: "Res3()",
  keyboardShortcut: "R",
});
export const Cap = add({
  kind: ElementKind.Cap,
  svgTag: "cap",
  symbol: {
    shapes: [],
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
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "c",
  defaultOf: "Cap()",
  keyboardShortcut: "c",
});
export const Cap3 = add({
  kind: ElementKind.Cap3,
  svgTag: "cap3",
  symbol: {
    shapes: [],
    svgLines: [
      // All of the two-terminal edition
      ...Cap.symbol.svgLines,
      // Plus the bulk connection
      `<path d="M -40 50 L -25 50" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
      { name: "b", loc: point.new(-40, 50) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "cap3",
  defaultOf: "Cap3()",
  keyboardShortcut: "C",
});
export const Ind = add({
  kind: ElementKind.Ind,
  svgTag: "ind",
  symbol: {
    shapes: [],
    svgLines: [
      `<path d="M 0 20 C 36 20, 36 40, 0 40 C 36 40, 36 60, 0 60 C 36 60, 36 80, 0 80" class="hdl21-symbols"/>`,
      `<path d="M 0 0 L 0 20" class="hdl21-symbols" />`,
      `<path d="M 0 80 L 0 100" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "l",
  defaultOf: "Ind()",
  keyboardShortcut: "l",
});
export const Ind3 = add({
  kind: ElementKind.Ind3,
  svgTag: "ind3",
  symbol: {
    shapes: [],
    svgLines: [
      // The shapes from the two-terminal inductor
      ...Ind.symbol.svgLines,
      // Plus the bulk connection
      `<path d="M -5 50 L -20 50" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
      { name: "b", loc: point.new(-20, 50) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "ind3",
  defaultOf: "Ind3()",
  keyboardShortcut: "L",
});

export const Vsource = add({
  kind: ElementKind.Vsource,
  svgTag: "vsource",
  symbol: {
    shapes: [], 
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
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "v",
  defaultOf: "V()",
  keyboardShortcut: "v",
});
export const Vsource4 = add({
  kind: ElementKind.Vsource4,
  svgTag: "vsource4",
  symbol: {
    shapes: [], 
    svgLines: [
      // All of the two-terminal edition
      ...Vsource.symbol.svgLines,
      // Control terminal connections
      `<path d="M -40 30 L -25 30" class="hdl21-symbols" />`,
      `<path d="M -40 70 L -25 70" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
      { name: "cp", loc: point.new(-40, 30) },
      { name: "cn", loc: point.new(-40, 70) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "v4",
  defaultOf: "V4()",
  keyboardShortcut: "V",
});
export const Isource = add({
  kind: ElementKind.Isource,
  svgTag: "isource",
  symbol: {
    shapes: [], 
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
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "i",
  defaultOf: "I()",
  keyboardShortcut: "i",
});
export const Isource4 = add({
  kind: ElementKind.Isource4,
  svgTag: "isource4",
  symbol: {
    shapes: [], 
    svgLines: [
      // All of the two-terminal edition
      ...Isource.symbol.svgLines,
      // Control terminal connections
      `<path d="M -40 30 L -25 30" class="hdl21-symbols" />`,
      `<path d="M -40 70 L -25 70" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "p", loc: point.new(0, 0) },
      { name: "n", loc: point.new(0, 100) },
      { name: "cp", loc: point.new(-40, 30) },
      { name: "cn", loc: point.new(-40, 70) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "i4",
  defaultOf: "I4()",
  keyboardShortcut: "I",
});
export const Diode = add({
  kind: ElementKind.Diode,
  svgTag: "diode",
  symbol: {
    shapes: [], 
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
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "d",
  defaultOf: "D()",
  keyboardShortcut: "d",
});

// Symbol elements shared between `Npn` and `Pnp`
const BipolarSharedSvgLines = [
  // Main squiggly path
  `<path d="M 0 0 L 0 20 L -30 40 L -30 60 L 0 80 L 0 100" class="hdl21-symbols" />`,
  // Base vertical bar
  `<path d="M -30 80 L -30 20" class="hdl21-symbols" />`,
  // Base connection
  `<path d="M -30 50 L -50 50" class="hdl21-symbols" />`,
];
export const Npn = add({
  kind: ElementKind.Npn,
  svgTag: "npn",
  symbol: {
    shapes: [], 
    svgLines: [
      // The shared parts
      ...BipolarSharedSvgLines,
      // and the triangle
      `<path d="M -20 78 L -10 62 L 0 80 Z" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "c", loc: point.new(0, 0) },
      { name: "b", loc: point.new(-50, 50) },
      { name: "e", loc: point.new(0, 100) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "npn",
  defaultOf: "Npn()",
  keyboardShortcut: "q",
});
export const Pnp = add({
  kind: ElementKind.Pnp,
  svgTag: "pnp",
  symbol: {
    shapes: [], 
    svgLines: [
      // The shared parts
      ...BipolarSharedSvgLines,
      // and the triangle
      `<path d="M -20 22 L -10 38 L -30 40 Z" class="hdl21-symbols" />`,
    ],
    ports: [
      { name: "c", loc: point.new(0, 0) },
      { name: "b", loc: point.new(-50, 50) },
      { name: "e", loc: point.new(0, 100) },
    ],
  },
  nameloc: point.new(10, 0),
  ofloc: point.new(10, 90),
  defaultNamePrefix: "pnp",
  defaultOf: "Pnp()",
  keyboardShortcut: "Q",
});

// The collection of elements as a JS object
export const elements = {
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

// Get a `Element` definition by its `ElementKind`.
// This exclamation-mark non-null assertion is valid so long as
// we ensure that every valid `ElementKind` is in the map.
function get(kind: ElementKind): Element {
  return ElementMap.get(kind)!;
}

export const elementLib = {
  ElementKind,
  elements,
  list: ElementList,
  kinds: ElementMap,
  tags: ElementTags,
  keyboardShortcuts: ElementKeyboardShortcuts,
  get,
  default: () => get(ElementKind.Nmos),
};
