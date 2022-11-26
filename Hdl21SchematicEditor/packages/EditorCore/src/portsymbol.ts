/*
 * # Port Symbols
 *
 * The definitions of the elements instantiable as schematic `Port`s.
 */

// Local Imports
import { Point, point } from "./point";

// # Enumerated Port Kinds
//
// The list of enumerated port types.
// Values are the port kind's string name.
//
export enum PortKind {
  Input = "Input",
  Output = "Output",
  Inout = "Inout",
}

// # Port "Symbol"
// (This name maybe could be improved.)
//
// The types of things which schematics can instantiate.
// Ports include the symbol drawing as an SVG string,
// plus metadata indicating their port names and locations.
//
export interface PortSymbol {
  kind: PortKind; // Enumerated port type
  svgTag: string; // SVG tag
  svgLines: Array<string>; // SVG symbol text
  nameloc: Point; // Location of name label
  keyboardShortcut: string; // Keyboard key for insertion in the editor
  defaultName: string; // Initial, default name when created
}

export const PortList: Array<PortSymbol> = [];

// Map from enumerated keys to `PortSymbol` objects.
export const PortMap: Map<PortKind, PortSymbol> = new Map();

// Map from SVG class tags to `PortSymbol` objects.
export const PortTags: Map<string, PortSymbol> = new Map();

// Map from (keyboard) key to `PortSymbol` objects.
export const PortKeyboardShortcuts: Map<string, PortSymbol> = new Map();

// Add `PortSymbol`s to the module-scope mappings.
function add(portsym: PortSymbol) {
  PortList.push(portsym);
  PortMap.set(portsym.kind, portsym);
  PortTags.set(portsym.svgTag, portsym);
  PortKeyboardShortcuts.set(portsym.keyboardShortcut, portsym);
  return portsym;
}

// Create the library of `PortSymbol`s.
export const Input = add({
  kind: PortKind.Input,
  svgTag: "input",
  svgLines: [
    `<path d="M -50 -10 L -50 10 L -30 10 L -20 0 L -30 -10 Z" class="hdl21-symbols" />`,
    `<path d="M -20 0 L 0 0" class="hdl21-symbols" />`,
  ],
  nameloc: point.new(-50, -25),
  keyboardShortcut: "i",
  defaultName: "inp",
});
export const Output = add({
  kind: PortKind.Output,
  svgTag: "output",
  svgLines: [
    `<path d="M 20 -10 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 20 0" class="hdl21-symbols" />`,
  ],
  nameloc: point.new(20, -25),
  keyboardShortcut: "o",
  defaultName: "out",
});
export const Inout = add({
  kind: PortKind.Inout,
  svgTag: "inout",
  svgLines: [
    `<path d="M 20 -10 L 10 0 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
    `<path d="M 0 0 L 10 0" class="hdl21-symbols" />`,
  ],
  nameloc: point.new(15, -25),
  keyboardShortcut: "z",
  defaultName: "io",
});

// The collection of port symbols as a JS object
export const portsymbols = {
  Input,
  Output,
  Inout,
};

// Get a `PortSymbol` definition by its `PortKind`.
// This exclamation-mark non-null assertion is valid so long as
// we ensure that every valid `kind` is in the map.
export function get(kind: PortKind): PortSymbol {
  return PortMap.get(kind)!;
}

// Export the module-scope mappings as a single object.
export const portLib = {
  PortKind,
  portsymbols,
  list: PortList,
  kinds: PortMap,
  tags: PortTags,
  keyboardShortcuts: PortKeyboardShortcuts,
  get,
  default: () => get(PortKind.Input),
};
