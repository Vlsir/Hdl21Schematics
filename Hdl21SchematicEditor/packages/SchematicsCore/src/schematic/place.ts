import { Point } from "./point";
import { Orientation } from "./orientation";
import { Direction } from "./direction";

// # Place 
// 
// A combination of location and orientation. 
// 
export interface Place {
  loc: Point;
  orientation: Orientation;
}

// Interface for things that can be placed,
// and have that `Place` updated in a few ways.
export interface Placeable {
  // Get the current placement
  place(): Place;
  // Update placement
  move(to: Place): void;
  // Rotate by one 90 degree increment
  rotate(): void;
  // Flip in direction `dir`
  flip(dir: Direction): void;
}
