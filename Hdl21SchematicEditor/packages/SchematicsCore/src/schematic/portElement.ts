/*
 * # Port Symbols
 *
 * The definitions of the elements instantiable as schematic `Port`s.
 */

// Local Imports
import { Point, point } from "./point";
import { Shape } from "./shape";

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

// # Port Symbol
//
// Similar to `Symbol`, but with an implicit, unnamed, since `InstancePort` at its origin.
//
export interface PortSymbol {
  svgLines: Array<string>; // SVG symbol text
  shapes: Array<Shape>; // FIXME: merge
}

// # PortElement
//
// Instantiable schematic-object to annotate nets as `SchPort`s.
//
export interface PortElement {
  kind: PortKind; // Enumerated port type
  svgTag: string; // SVG tag
  symbol: PortSymbol; // Symbol
  nameloc: Point; // Location of name label
  keyboardShortcut: string; // Keyboard key for insertion in the editor
  defaultName: string; // Initial, default name when created
}

export const PortList: Array<PortElement> = [];

// Map from enumerated keys to `PortElement` objects.
export const PortMap: Map<PortKind, PortElement> = new Map();

// Map from SVG class tags to `PortElement` objects.
export const PortTags: Map<string, PortElement> = new Map();

// Map from (keyboard) key to `PortElement` objects.
export const PortKeyboardShortcuts: Map<string, PortElement> = new Map();

// Add `PortElement`s to the module-scope mappings.
function add(portElement: PortElement) {
  PortList.push(portElement);
  PortMap.set(portElement.kind, portElement);
  PortTags.set(portElement.svgTag, portElement);
  PortKeyboardShortcuts.set(portElement.keyboardShortcut, portElement);
  return portElement;
}

// Create the library of `PortElement`s.
export const Input = add({
  kind: PortKind.Input,
  svgTag: "input",
  symbol: {
    shapes: [],
    svgLines: [
      `<path d="M -50 -10 L -50 10 L -30 10 L -20 0 L -30 -10 Z" class="hdl21-symbols" />`,
      `<path d="M -20 0 L 0 0" class="hdl21-symbols" />`,
    ],
  },
  nameloc: point.new(-50, -25),
  keyboardShortcut: "i",
  defaultName: "inp",
});
export const Output = add({
  kind: PortKind.Output,
  svgTag: "output",
  symbol: {
    shapes: [],
    svgLines: [
      `<path d="M 20 -10 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 20 0" class="hdl21-symbols" />`,
    ],
  },
  nameloc: point.new(20, -25),
  keyboardShortcut: "o",
  defaultName: "out",
});
export const Inout = add({
  kind: PortKind.Inout,
  svgTag: "inout",
  symbol: {
    shapes: [],
    svgLines: [
      `<path d="M 20 -10 L 10 0 L 20 10 L 40 10 L 50 0 L 40 -10 Z" class="hdl21-symbols" />`,
      `<path d="M 0 0 L 10 0" class="hdl21-symbols" />`,
    ],
  },
  nameloc: point.new(15, -25),
  keyboardShortcut: "z",
  defaultName: "io",
});

// The collection of port symbols as a JS object
export const portElements = {
  Input,
  Output,
  Inout,
};

// Get a `PortElement` definition by its `PortKind`.
// This exclamation-mark non-null assertion is valid so long as
// we ensure that every valid `kind` is in the map.
function get(kind: PortKind): PortElement {
  return PortMap.get(kind)!;
}

// Export the module-scope mappings as a single object.
export const portLib = {
  PortKind,
  portElements,
  list: PortList,
  kinds: PortMap,
  tags: PortTags,
  keyboardShortcuts: PortKeyboardShortcuts,
  get,
  default: () => get(PortKind.Input),
};
