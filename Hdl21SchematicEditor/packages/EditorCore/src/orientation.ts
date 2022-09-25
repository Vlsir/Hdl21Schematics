// Local Imports
import { exhaust } from "./errors";

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
    default:
      throw exhaust(rotation); // Exhaustiveness check
  }
}

// Instance Orientation
// including reflection & rotation
//
export interface Orientation {
  reflected: boolean;
  rotation: Rotation;
}

// The "impl" of orientation-related functions
export const orientation = {
  new: (reflected: boolean, rotation: Rotation): Orientation => {
    return { reflected, rotation };
  },
  default: (): Orientation => {
    return { reflected: false, rotation: Rotation.R0 };
  },
  // Create an `Orientation` from an `OrientationMatrix`.
  // A very small subset of possible matrices are valid;
  // any other value provided throws an error.
  fromMatrix: (matrix: OrientationMatrix): Orientation => {
    const { a, b, c, d } = matrix;
    if (a === 1 && b === 0 && c === 0 && d === 1) {
      return orientation.default();
    }
    if (a === 0 && b === 1 && c === -1 && d === 0) {
      return orientation.new(false, Rotation.R90);
    }
    if (a === -1 && b === 0 && c === 0 && d === -1) {
      return orientation.new(false, Rotation.R180);
    }
    if (a === 0 && b === -1 && c === 1 && d === 0) {
      return orientation.new(false, Rotation.R270);
    }
    if (a === 1 && b === 0 && c === 0 && d === -1) {
      return orientation.new(true, Rotation.R0);
    }
    if (a === 0 && b === 1 && c === 1 && d === 0) {
      return orientation.new(true, Rotation.R90);
    }
    if (a === -1 && b === 0 && c === 0 && d === 1) {
      return orientation.new(true, Rotation.R180);
    }
    if (a === 0 && b === -1 && c === -1 && d === 0) {
      return orientation.new(true, Rotation.R270);
    }
    throw new Error(`Invalid orientation matrix: ${matrix}`);
  },
};

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
export interface OrientationMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
}

// The "impl" of matrix-related functions
export const matrix = {
  new: (a: number, b: number, c: number, d: number): OrientationMatrix => {
    return { a, b, c, d };
  },
  identity: (): OrientationMatrix => {
    return { a: 1, b: 0, c: 0, d: 1 };
  },
  fromOrientation: (orientation: Orientation): OrientationMatrix => {
    switch (orientation.reflected) {
      case false: {
        switch (orientation.rotation) {
          case Rotation.R0:
            return matrix.identity();
          case Rotation.R90:
            return matrix.new(0, 1, -1, 0);
          case Rotation.R180:
            return matrix.new(-1, 0, 0, -1);
          case Rotation.R270:
            return matrix.new(0, -1, 1, 0);
          default:
            throw exhaust(orientation.rotation);
        }
      }
      case true: {
        switch (orientation.rotation) {
          case Rotation.R0:
            return matrix.new(1, 0, 0, -1);
          case Rotation.R90:
            return matrix.new(0, 1, 1, 0);
          case Rotation.R180:
            return matrix.new(-1, 0, 0, 1);
          case Rotation.R270:
            return matrix.new(0, -1, -1, 0);
          default:
            throw exhaust(orientation.rotation);
        }
      }
      default:
        throw exhaust(orientation.reflected);
    }
  },
};
