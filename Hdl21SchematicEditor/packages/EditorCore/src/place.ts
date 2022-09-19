import { Point } from "./point";
import { Orientation } from "./schematicdata";

export interface Place {
  loc: Point;
  orientation: Orientation;
}
