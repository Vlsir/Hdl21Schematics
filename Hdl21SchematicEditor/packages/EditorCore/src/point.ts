// # Point
// Two-dimensional point in schematic-UI space.
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
// Most users will import this as
// `import { Point, point } from 'path/to/point';`
//
export const point = {
  new: (x: number, y: number): Point => ({ x, y }),
  eq: (a: Point, b: Point) => a.x === b.x && a.y === b.y,
};
