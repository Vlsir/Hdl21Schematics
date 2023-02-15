// 
// # Orientation
// Including reflection & 90 degree increment rotations
// 

// Local Imports
import { OrientationMatrix, matrix } from "./matrix";
import { Rotation } from "./rotation";

// # Orientation
// including reflection & 90 degree increment rotation
export interface Orientation {
  reflected: boolean; // Vertical reflection, applied before rotation
  rotation: Rotation; // Rotation in increments of 90 degrees
}

// The "impl" of orientation-related functions
export const orientation = {
  // Create a new `Orientation`
  new: (reflected: boolean, rotation: Rotation): Orientation => {
    return { reflected, rotation };
  },
  // Default orientation
  // No reflection, no rotation
  default: (): Orientation => {
    return { reflected: false, rotation: Rotation.R0 };
  },
  // Convert to a matrix. Implemented in `matrix.ts`
  toMatrix: (orientation: Orientation): OrientationMatrix =>
    matrix.fromOrientation(orientation),
  // Convert from a matrix. Implemented in `matrix.ts`
  fromMatrix: (mat: OrientationMatrix): Orientation =>
    matrix.toOrientation(mat),
};
