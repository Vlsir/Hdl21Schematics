import { Point } from "./point";
import { Orientation } from "./schematic";

export interface Place {
  loc: Point;
  orientation: Orientation;
}
