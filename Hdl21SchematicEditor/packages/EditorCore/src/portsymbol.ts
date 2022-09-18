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
// Serves as the keys in the `PortMap` mapping,
// and the key stored on each `Port` object.
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

// Map from enumerated keys to `PortSymbol` objects.
export const PortMap: Map<PortKind, PortSymbol> = new Map();

// Map from SVG class tags to `PortSymbol` objects.
export const PortTags: Map<string, PortSymbol> = new Map();

// Map from (keyboard) key to `PortSymbol` objects.
export const PortKeyboardShortcuts: Map<string, PortSymbol> = new Map();

// Add `PortSymbol`s to the module-scope mappings.
function add(portsyms: Array<PortSymbol>) {
  for (let portsym of portsyms) {
    PortMap.set(portsym.kind, portsym);
    PortTags.set(portsym.svgTag, portsym);
    PortKeyboardShortcuts.set(portsym.keyboardShortcut, portsym);
  }
}

// Create the library of `PortSymbol`s.
add([
  {
    kind: PortKind.Input,
    svgTag: "hdl21::primitives::input",
    svgLines: [
      `<path d="M -50 -10 L -50 10 L -30 10 L -20 0 L -30 -10 Z" class="hdl21-symbols" />`,
      `<path d="M -20 0 L 0 0" class="hdl21-symbols" />`,
    ],
    nameloc: point(-50, -25),
    keyboardShortcut: "i",
    defaultName: "inp",
  },
  {
    kind: PortKind.Output,
    svgTag: "hdl21::primitives::output",
    svgLines: [
      `<path d="M 20 -10 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 20 0" class="hdl21-symbols" />`,
    ],
    nameloc: point(20, -25),
    keyboardShortcut: "o",
    defaultName: "out",
  },
  {
    kind: PortKind.Inout,
    svgTag: "hdl21::primitives::inout",
    svgLines: [
      `<path d="M 20 -10 L 10 0 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 10 0" class="hdl21-symbols" />`,
    ],
    nameloc: point(15, -25),
    keyboardShortcut: "z",
    defaultName: "io",
  },
]);
