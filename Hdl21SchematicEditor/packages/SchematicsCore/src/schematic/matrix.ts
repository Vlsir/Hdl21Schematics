//
// # Orientation Matrices
//

// Local Imports
import { exhaust } from "../errors";
import { Rotation } from "./rotation";
import { Orientation } from "./orientation";

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
export const OrientationMatrix = {
  new: (a: number, b: number, c: number, d: number): OrientationMatrix => {
    return { a, b, c, d };
  },
  identity: (): OrientationMatrix => {
    return { a: 1, b: 0, c: 0, d: 1 };
  },
  toOrientation,
  fromOrientation,
};

// FIXME: deprecate this alias 
export const matrix = OrientationMatrix;

//
// # NOTE:
//
// There are really a total of eight valid orientation matrices, paired with the eight values of `Orientation`.
// It would be great if TS/ JS let us define a mapping, hashmap, dictionary, or similar between the two.
// Because both are objects and TS/ JS really, really prefer "identity equality" for comparing keys,
// just writing these two functions turns out aways easier than trying to define a mapping.
//

// Create an `Orientation` from an `OrientationMatrix`.
// A very small subset of possible matrices are valid;
// any other value provided throws an error.
export function toOrientation(matrix: OrientationMatrix): Orientation {
  const { a, b, c, d } = matrix;
  if (a === 1 && b === 0 && c === 0 && d === 1) {
    return Orientation.default();
  }
  if (a === 0 && b === 1 && c === -1 && d === 0) {
    return Orientation.new(false, Rotation.R270);
  }
  if (a === -1 && b === 0 && c === 0 && d === -1) {
    return Orientation.new(false, Rotation.R180);
  }
  if (a === 0 && b === -1 && c === 1 && d === 0) {
    return Orientation.new(false, Rotation.R90);
  }
  if (a === 1 && b === 0 && c === 0 && d === -1) {
    return Orientation.new(true, Rotation.R0);
  }
  if (a === 0 && b === 1 && c === 1 && d === 0) {
    return Orientation.new(true, Rotation.R90);
  }
  if (a === -1 && b === 0 && c === 0 && d === 1) {
    return Orientation.new(true, Rotation.R180);
  }
  if (a === 0 && b === -1 && c === -1 && d === 0) {
    return Orientation.new(true, Rotation.R270);
  }
  throw new Error(`Invalid orientation matrix: ${matrix}`);
}

export function fromOrientation(orientation: Orientation): OrientationMatrix {
  switch (orientation.reflected) {
    case false: {
      switch (orientation.rotation) {
        case Rotation.R0:
          return matrix.identity();
        case Rotation.R90:
          return matrix.new(0, -1, 1, 0);
        case Rotation.R180:
          return matrix.new(-1, 0, 0, -1);
        case Rotation.R270:
          return matrix.new(0, 1, -1, 0);
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
}
