//
// # Reflection State
//
// For elements which can be flipped horizontally and/or vertically,
// but cannot be rotated. Primarily text elements.
//

import { Rotation } from "./rotation";
import { Orientation } from "./orientation";
import { OrientationMatrix } from "./matrix";

// Reflection State
// Flipping the element horizontally and/or vertically
export interface Reflect {
  horiz: boolean;
  vert: boolean;
}

function toOrientation(ref: Reflect): Orientation {
  const { horiz, vert } = ref;
  if (horiz && vert) {
    return Orientation.new(false, Rotation.R180);
  }
  if (vert) {
    return Orientation.new(true, Rotation.R0);
  }
  if (horiz) {
    return Orientation.new(true, Rotation.R180);
  }
  return Orientation.default();
}

function toMatrix(ref: Reflect): OrientationMatrix {
  return OrientationMatrix.fromOrientation(toOrientation(ref));
}

// The "impl" functions for `Reflect`
export const Reflect = { toOrientation, toMatrix };

// FIXME: deprecate this lower-case name
export const reflect = Reflect;
