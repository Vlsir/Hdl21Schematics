import { Line } from "two.js/src/shapes/line";

// Local Imports
import { Point }  from "./point";
import { theCanvas } from "./canvas";
import { gridLineStyle } from "./style";

export const GRID_SIZE = 10;
export const GRID_MAJOR_SIZE = 100;

// Draw the background grid with dimensions of `size`. 
export function setupGrid (size: Point) {
    // Get the outline size from the Schematic
    const x = size.x;
    const y = size.y;

    for (let i = 0; i <= x; i += 10) {
      const line = new Line(i, 0, i, y);
      theCanvas.gridLayer.add(line);
      gridLineStyle(line, i % 100 == 0);
    }
    for (let i = 0; i <= y; i += 10) {
      const line = new Line(0, i, x, i);
      theCanvas.gridLayer.add(line);
      gridLineStyle(line, i % 100 == 0);
    }
  };