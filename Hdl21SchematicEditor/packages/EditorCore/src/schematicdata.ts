/*
 * # The Abstract Schematic Model
 *
 * Content of `Schematic`s, independent of SVG formatting.
 */

// Local Imports
import { point, Point } from "./point";
import { PortKind, PortSymbol } from "./portsymbol";
import { ElementKind, Element } from "./element";
import { Orientation } from "./orientation";

export interface Wire {
  points: Array<Point>;
}

export interface Port {
  name: string;
  kind: PortKind;
  portsymbol: PortSymbol; // FIXME: exclude if ever serialized
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

export class Schematic {
  name: string = "";
  size: Point = point.new(1600, 800);
  prelude: string = "";
  instances: Array<Instance> = [];
  ports: Array<Port> = [];
  wires: Array<Wire> = [];
  dots: Array<Point> = [];
  otherSvgElements: Array<string> = [];
}
