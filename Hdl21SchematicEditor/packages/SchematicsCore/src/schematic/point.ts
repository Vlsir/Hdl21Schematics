// # Point
// Two-dimensional point in schematic-space.
export interface Point {
  x: number;
  y: number;
}

// The `Point` "implementation" / "namespace".
//
// Associated functions.
// It proves pretty helpful to make `Point` a TypeScript interface,
// and a JavaScript plain-old-object, but also to have functions like these,
// e.g. a constructor-like function, custom equality, and the like.
//
export const Point = {
  new: (x: number, y: number): Point => ({ x, y }),
  eq: (a: Point, b: Point) => a.x === b.x && a.y === b.y,
};

// FIXME: deprecate this lower-case name
export const point = Point;
