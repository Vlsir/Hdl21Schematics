//
// # Rotation
//
// Enumerated rotations in increments of 90 degrees
//

// Local Imports
import { exhaust } from "../errors";

// Enumerated Rotations
// in increments of 90 degrees
export enum Rotation {
  R0 = "R0",
  R90 = "R90",
  R180 = "R180",
  R270 = "R270",
}

// Get the next `Rotation` in the sequence
function next(rotation: Rotation) {
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
// Get the previous `Rotation` in the sequence
function prev(rotation: Rotation) {
  switch (rotation) {
    case Rotation.R0:
      return Rotation.R270;
    case Rotation.R90:
      return Rotation.R0;
    case Rotation.R180:
      return Rotation.R90;
    case Rotation.R270:
      return Rotation.R180;
    default:
      throw exhaust(rotation); // Exhaustiveness check
  }
}

// The "impl block" for `Rotation`s.
export const rotation = { next, prev };
