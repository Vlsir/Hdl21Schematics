import { Point, point } from "./point";

// # Mouse Position
//
// Including page (app) and canvas coordinates.
//
export interface MousePos {
  page: Point; // The page position, as reported by the browser.
  canvas: Point; // The canvas position, as reported by the `Canvas` class.
}
export const mousepos = {
  // Get a mouse-position at the origin of *both* coordinate systems.
  // Note this is not necessarily a *valid* mouse-position; the two origins generally differ.
  origin: (): MousePos => ({ page: point.new(0, 0), canvas: point.new(0, 0) }),
};
