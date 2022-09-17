/*
 * # The Abstract Schematic Model
 *
 * Content of `Schematic`s, independent of SVG formatting.
 */

// Local Imports
import { Point } from "./point";
import { PortKind } from "./portsymbol";

// FIXME! use an actual enum from `primitive`
type PrimitiveKind = any;

// Enumerated Rotations
// in increments of 90 degrees
export enum Rotation {
  R0 = "R0",
  R90 = "R90",
  R180 = "R180",
  R270 = "R270",
}

// Get the next `Rotation` in the sequence
export function nextRotation(rotation: Rotation) {
  switch (rotation) {
    case Rotation.R0:
      return Rotation.R90;
    case Rotation.R90:
      return Rotation.R180;
    case Rotation.R180:
      return Rotation.R270;
    case Rotation.R270:
      return Rotation.R0;
    // FIXME: add the "invalid value produces error" never-type thing.
  }
}

// Instance Orientation
// including reflection & rotation
//
export class Orientation {
  reflected: boolean;
  rotation: Rotation;
  constructor(reflected: boolean, rotation: Rotation) {
    this.reflected = reflected;
    this.rotation = rotation;
  }
  // Create a copy of this orientation.
  copy = () => new Orientation(this.reflected, this.rotation);
  // The default orientation: no reflection, no rotation.
  static default() /* => Orientation */ {
    return new Orientation(false, Rotation.R0);
  }
  // Create an `Orientation` from an `OrientationMatrix`.
  // A very small subset of possible matrices are valid;
  // any other value provided throws an error.
  static fromMatrix(matrix: OrientationMatrix) /* => Orientation */ {
    var reflected; // Boolean - flipped across the x axis
    var rotation; // Rotation in increments of 90 degrees, valued 0-3

    // There are a total of eight valid values of the Instance transform.
    // Check each, and if we have anything else, fail.
    // SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to
    // | a c |
    // | b d |
    if (matrix.eq(new OrientationMatrix(1, 0, 0, 1))) {
      reflected = false;
      rotation = Rotation.R0;
    } else if (matrix.eq(new OrientationMatrix(0, 1, -1, 0))) {
      reflected = false;
      rotation = Rotation.R90;
    } else if (matrix.eq(new OrientationMatrix(-1, 0, 0, -1))) {
      reflected = false;
      rotation = Rotation.R180;
    } else if (matrix.eq(new OrientationMatrix(0, -1, 1, 0))) {
      reflected = false;
      rotation = Rotation.R270;
    } else if (matrix.eq(new OrientationMatrix(1, 0, 0, -1))) {
      reflected = true;
      rotation = Rotation.R0;
    } else if (matrix.eq(new OrientationMatrix(0, 1, 1, 0))) {
      reflected = true;
      rotation = Rotation.R90;
    } else if (matrix.eq(new OrientationMatrix(-1, 0, 0, 1))) {
      reflected = true;
      rotation = Rotation.R180;
    } else if (matrix.eq(new OrientationMatrix(0, -1, -1, 0))) {
      reflected = true;
      rotation = Rotation.R270;
    } else {
      throw new Error(`Invalid transform: ${matrix}`);
    }

    // Success - create and return the Orientation.
    return new Orientation(reflected, rotation);
  }
}

//
// # Orientation Matrix
//
// 2x2 matrix representation of an `Orientation`
// Largely corresponds to the values placed in SVG `matrix` attributes.
// SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to
// | a c |
// | b d |
// The fields of `OrientationMatrix` are named similarly.
//
export class OrientationMatrix {
  a: number;
  b: number;
  c: number;
  d: number;

  constructor(a: number, b: number, c: number, d: number) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }
  // Orientation Matrix Equality
  eq = (other: OrientationMatrix) => /* bool */ {
    return (
      this.a === other.a &&
      this.b === other.b &&
      this.c === other.c &&
      this.d === other.d
    );
  };
}

export class Wire {
  points: Array<Point>;
  constructor(points: Array<Point>) {
    this.points = points;
  }
}

export class Port {
  name: string;
  kind: PortKind;
  loc: Point;
  orientation: Orientation;
  constructor(
    name: string,
    kind: PortKind,
    loc: Point,
    orientation: Orientation
  ) {
    this.name = name; // string
    this.kind = kind; // PortKind
    this.loc = loc; // Point
    this.orientation = orientation; // Orientation
  }
}

export class Instance {
  name: string;
  of: string;
  kind: PrimitiveKind;
  loc: Point;
  orientation: Orientation;
  constructor(
    name: string,
    of: string,
    kind: PrimitiveKind,
    loc: Point,
    orientation: Orientation
  ) {
    // Instance Data
    this.name = name; // string
    this.of = of; // string
    this.kind = kind; // PrimitiveKind
    this.loc = loc; // Point
    this.orientation = orientation; // Orientation
  }
}
export class Schematic {
  constructor(name: string, size: Point) {
    this.name = name;
    this.size = size;
  }
  name: string;
  size: Point;
  instances: Array<Instance> = [];
  ports: Array<Port> = [];
  wires: Array<Wire> = [];
  dots: Array<Point> = [];
}
