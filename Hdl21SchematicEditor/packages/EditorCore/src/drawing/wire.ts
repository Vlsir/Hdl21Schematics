import { Path } from "two.js/src/path";

// Local Imports
import { EntityInterface, EntityKind } from "./entity";
import { wireStyle } from "./style";
import { Canvas } from "./canvas";
import { MousePos } from "../mousepos";
import { Point } from "../point";
import { ManhattanSegment, hitTestSegment, calcSegments } from "../manhattan";
import { Dot, DotParent } from "./dot";
import { theEditor } from "../editor";

// Wrapper for hit-testing the pointer against drawn wire segements,
// with tolerance equal to their drawn width.
const hitTestDrawnSegment = (seg: ManhattanSegment, pt: Point): boolean => {
  const HIT_TEST_WIDTH = 5; // Equal to half the drawn width.
  return hitTestSegment(seg, pt, HIT_TEST_WIDTH);
};

export class Wire implements EntityInterface, DotParent {
  constructor(public points: Array<Point>) {}

  entityKind: EntityKind.Wire = EntityKind.Wire;
  drawing: Path | null = null; // FIXME: get rid of the null case
  highlighted: boolean = false;
  segments: Array<ManhattanSegment> | null = null;
  entityId: number | null = null; // Numeric unique ID
  canvas: Canvas = theEditor.canvas; // Reference to the drawing canvas. FIXME: the "the" part.
  dots: Set<Dot> = new Set();

  static create(points: Array<Point>): Wire {
    return new Wire(points);
  }
  // Create from a list of `Point`s. Primarily creates the drawn `Path`.
  draw() {
    if (this.drawing) {
      // Remove any existing drawing
      this.drawing.remove();
      this.drawing = null;
    }
    // Flatten coordinates into the form [x1, y1, x2, y2, ...]
    let coords = [];
    for (let point of this.points) {
      coords.push(point.x, point.y);
    }
    // Create the drawing
    this.drawing = this.canvas.two.makePath(...coords);
    this.canvas.wireLayer.add(this.drawing);
    // Set the wire style
    wireStyle(this.drawing);

    if (this.highlighted) {
      this.highlight();
    }
  }
  // Abort drawing an in-progress wire.
  abort() {
    this.drawing?.remove();
  }
  // Update styling to indicate highlighted-ness
  highlight() {
    if (!this.drawing) {
      return; // FIXME!
    }
    this.drawing.stroke = "red";
    this.highlighted = true;
  }
  // Update styling to indicate the lack of highlighted-ness
  unhighlight() {
    if (!this.drawing) {
      return; // FIXME!
    }
    this.drawing.stroke = "blue";
    this.highlighted = false;
  }
  // Boolean indication of whether `point` lands on the wire. i.e. on any of its segments.
  hitTest(mousePos: MousePos): boolean {
    this.updateSegments();
    if (!this.segments) {
      return false;
    }
    return this.segments.some((segment) =>
      hitTestDrawnSegment(segment, mousePos.canvas)
    );
  }
  updateSegments() {
    if (!this.segments) {
      this.segments = calcSegments(this.points);
    }
  }
  removeDot(dot: Dot): void {
    this.dots.delete(dot);
  }
}
