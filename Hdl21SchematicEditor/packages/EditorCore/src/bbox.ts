import { Point } from "./point";

// # Bbox
// Rectangular Bounding Box
export interface Bbox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// Interface for objects that have a `getBoundingClientRect` method
// Two.js does not have a type for this, so we define our own.
export interface HasBbox {
  getBoundingClientRect: () => any;
}

// Associated `Bbox` functions
export const bbox = {
  new: (top: number, bottom: number, left: number, right: number): Bbox => ({
    top,
    bottom,
    left,
    right,
  }),
  empty: (): Bbox => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  get: (elem: HasBbox): Bbox => {
    const bbox = elem.getBoundingClientRect();
    const { top, bottom, left, right } = bbox;
    return { top, bottom, left, right };
  },
  hitTest: (bbox: Bbox, point: Point): boolean => {
    return (
      point.x > bbox.left &&
      point.x < bbox.right &&
      point.y > bbox.top &&
      point.y < bbox.bottom
    );
  },
};
