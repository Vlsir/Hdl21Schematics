//
// # Graphical Elements
//
// The stuff in "vector graphics" - paths, circles, etc.
//

import { Point } from "./point";

export enum ShapeKind {
  Path = "Path",
  Circle = "Circle",
}

// # Path
// An optionally closed arbitrary path.
export interface Path {
  kind: ShapeKind.Path;
  points: Array<Point>;
  closed: boolean;
  metadata: Map<string, any>;
}

// # Circle
export interface Circle {
  kind: ShapeKind.Circle;
  center: Point;
  radius: number;
  metadata: Map<string, any>;
}

export type Shape = Path | Circle; // | ... more shapes
