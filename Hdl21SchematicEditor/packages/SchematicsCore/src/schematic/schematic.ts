//
// # The Abstract Schematic Model
//
// Content of `Schematic`s, independent of SVG formatting.
//

// Local Imports
import { Point } from "./point";
import { PortKind, PortElement } from "./portElement";
import { ElementKind, Element } from "./element";
import { Orientation } from "./orientation";

export interface Wire {
  points: Array<Point>;
}

export interface Port {
  name: string;
  kind: PortKind;
  portElement: PortElement; // FIXME: exclude if ever serialized
  loc: Point;
  orientation: Orientation;
}

export interface Instance {
  name: string;
  of: string;
  kind: ElementKind;
  element: Element; // FIXME: exclude if ever serialized
  loc: Point;
  orientation: Orientation;
}

// # Schematic
export interface Schematic {
  name: string;
  size: Point;
  prelude: string;
  instances: Array<Instance>;
  ports: Array<Port>;
  wires: Array<Wire>;
  dots: Array<Point>;
  otherSvgElements: Array<string>;
}

// # Schematic Namespace
export const Schematic = {
  // Create a new and empty `Schematic`.
  new_: (): Schematic => ({
    name: "",
    size: Point.new(1600, 800),
    prelude: "",
    instances: [],
    ports: [],
    wires: [],
    dots: [],
    otherSvgElements: [],
  }),
};
