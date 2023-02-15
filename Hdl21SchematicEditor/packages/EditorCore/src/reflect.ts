// 
// # Reflection State
// 
// For elements which can be flipped horizontally and/or vertically, 
// but cannot be rotated. Primarily text elements. 
// 

import { Orientation, orientation } from "./orientation";
import { Rotation } from "./rotation";
import { OrientationMatrix, matrix } from "./matrix";

// Reflection State
// Flipping the element horizontally and/or vertically
export interface Reflect {
  horiz: boolean;
  vert: boolean;
}
function toOrientation(ref: Reflect): Orientation {
  const { horiz, vert } = ref;
  if (horiz && vert) {
    return orientation.new(false, Rotation.R180);
  }
  if (vert) {
    return orientation.new(true, Rotation.R0);
  }
  if (horiz) {
    return orientation.new(true, Rotation.R180);
  }
  return orientation.default();
}
function toMatrix(ref: Reflect): OrientationMatrix {
  return matrix.fromOrientation(toOrientation(ref));
}
// The "impl" functions for `Reflect`
export const reflect = { toOrientation, toMatrix };
