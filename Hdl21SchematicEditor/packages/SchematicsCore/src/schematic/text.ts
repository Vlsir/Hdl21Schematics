//
// # Text Labels
//
// Really mostly sub-data about the orientation and justification of text labels.
//

// Local Imports
import { exhaust } from "../errors";
import { Orientation } from "./orientation";
import { Rotation } from "./rotation";
import { Reflect } from "./reflect";

// # Text Label Justification / Alignment
export enum TextAlign {
  Left = "left",
  Right = "right",
}

// # Text Label Orientation
// Including text right/ left justification. Generally as determined by the orientation of its parent.
// Note text does not have 90/ 270 degree rotations, only horizontal and vertical reflection.
export interface TextOrientation {
  alignment: TextAlign;
  reflect: Reflect;
}

// Get the target orientation of a Label from its parent's orientation
export function labelOrientation(parent: Orientation): TextOrientation {
  const { rotation, reflected } = parent;
  if (!reflected) {
    switch (rotation) {
      case Rotation.R180:
        return {
          alignment: TextAlign.Right,
          reflect: { horiz: true, vert: true },
        };
      case Rotation.R0:
      case Rotation.R90:
      case Rotation.R270:
        return {
          alignment: TextAlign.Left,
          reflect: { horiz: false, vert: false },
        };
      default:
        throw exhaust(rotation); // Exhaustiveness check
    }
  } else {
    switch (rotation) {
      case Rotation.R0:
        return {
          alignment: TextAlign.Left,
          reflect: { horiz: false, vert: true },
        };
      case Rotation.R180:
      case Rotation.R90:
      case Rotation.R270:
        return {
          alignment: TextAlign.Right,
          reflect: { horiz: true, vert: false },
        };
      default:
        throw exhaust(rotation); // Exhaustiveness check
    }
  }
}
