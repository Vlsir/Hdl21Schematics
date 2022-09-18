// # Point
// Two-dimensional point in schematic-UI space.
export interface Point {
  x: number;
  y: number;
}

// The `Point` "constructor".
// It proves pretty helpful to make `Point` a TypeScript interface,
// and a JavaScript plain-old-object, but also to have a constructor-like function.
//
export function point(x: number, y: number): Point {
  return { x, y };
}
