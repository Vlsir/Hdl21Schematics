// # Point
// Two-dimensional point in schematic-UI space.
export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  copy() {
    return new Point(this.x, this.y);
  }
}
