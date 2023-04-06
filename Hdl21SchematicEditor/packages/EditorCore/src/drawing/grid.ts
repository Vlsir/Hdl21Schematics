import { Line } from "two.js/src/shapes/line";

// Local Imports
import { Canvas } from "./canvas";
import { gridLineStyle } from "./style";
import { Point, point } from "SchematicsCore";

export const GRID_SIZE = 10;
export const GRID_MAJOR_SIZE = 100;

// Draw the background grid with dimensions of `size`.
export function setupGrid(size: Point, canvas: Canvas) {
  // Get the outline size from the Schematic
  const x = size.x;
  const y = size.y;

  for (let i = 0; i <= x; i += 10) {
    const line = new Line(i, 0, i, y);
    canvas.gridLayer.add(line);
    gridLineStyle(line, i % 100 == 0);
  }
  for (let i = 0; i <= y; i += 10) {
    const line = new Line(0, i, x, i);
    canvas.gridLayer.add(line);
    gridLineStyle(line, i % 100 == 0);
  }
}

// Given a `Point`, return the nearest grid point.
export function nearestOnGrid(loc: Point): Point {
  return point.new(
    Math.round(loc.x / GRID_SIZE) * GRID_SIZE,
    Math.round(loc.y / GRID_SIZE) * GRID_SIZE
  );
}

// Find the nearest Manhattan-separated point on the grid relative to `relativeTo`.
export function nearestManhattan(loc: Point, relativeTo: Point): Point {
  const dx = relativeTo.x - loc.x;
  const dy = relativeTo.y - loc.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal segment
    return nearestOnGrid(point.new(loc.x, relativeTo.y));
  } else {
    // Vertical segment
    return nearestOnGrid(point.new(relativeTo.x, loc.y));
  }
}
