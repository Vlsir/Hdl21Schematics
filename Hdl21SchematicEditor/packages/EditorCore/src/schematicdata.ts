/*
 * # The Abstract Schematic Model
 *
 * Content of `Schematic`s, independent of SVG formatting.
 */

// Local Imports
import { Point } from "./point";
import { PortKind, PortSymbol } from "./portsymbol";
import { PrimitiveKind, Primitive } from "./primitive";
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
  kind: PrimitiveKind;
  primitive: Primitive; // FIXME: exclude if ever serialized
  loc: Point;
  orientation: Orientation;
}

export class Schematic {
  constructor(public name: string, public size: Point) {}

  prelude: string = "";
  instances: Array<Instance> = [];
  ports: Array<Port> = [];
  wires: Array<Wire> = [];
  dots: Array<Point> = [];
}
