//
// # Graphical Elements
//
// The stuff in "vector graphics" - paths, circles, text elements, etc.
// Each includes a set of map-based semi-arbitrary metadata.
//

import { Point } from "./point";

export enum GraphicsKind {
  Path = "Path",
  Circle = "Circle",
  Text = "Text",
}

// # Path
// An optionally closed arbitrary path.
export interface Path {
  kind: GraphicsKind.Path;
  points: Array<Point>;
  closed: boolean;
  metadata: Map<string, any>;
}

// # Circle
export interface Circle {
  kind: GraphicsKind.Circle;
  center: Point;
  radius: number;
  metadata: Map<string, any>;
}

// # Text 
export interface Text {
  kind: GraphicsKind.Text;
  string: String;
  // FIXME: more fields
  metadata: Map<string, any>;
}

export type GraphicsElement = Path | Circle | Text; 
