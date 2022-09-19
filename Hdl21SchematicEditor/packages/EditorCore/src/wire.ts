import { Path } from "two.js/src/path";

// Local Imports
import { Point } from "./point";
import { Direction } from "./direction";
import { wireStyle } from "./style";
import { theCanvas } from "./canvas";
import { EntityInterface, EntityKind } from "./entity";

// Module-level state of the two.js canvas
const two = theCanvas.two;

// # Manhattan Wire Segment
// Runs either horizontally or vertically in direction `dir`,
// at a constant coordinate `at` and between `start` and `end`.
export interface ManhattanWireSegment {
  direction: Direction;
  at: number;
  start: number;
  end: number;
}
// Boolean indication of whether `pt` intersects this segment."""
function hitTestSegment(seg: ManhattanWireSegment, pt: Point): boolean {
  const HIT_TEST_WIDTH = 10; // Equaly to the drawn width.

  if (seg.direction === Direction.Horiz) {
    return (
      Math.abs(pt.y - seg.at) < HIT_TEST_WIDTH / 2 &&
      pt.x >= seg.start &&
      pt.x <= seg.end
    );
  }
  // Vertical segment
  return (
    Math.abs(pt.x - seg.at) < HIT_TEST_WIDTH / 2 &&
    pt.y >= seg.start &&
    pt.y <= seg.end
  );
}

export class Wire implements EntityInterface {
  entityKind: EntityKind = EntityKind.Wire;

  points: Array<Point>;
  drawing: Path | null = null;
  highlighted: boolean = false;
  segments: Array<ManhattanWireSegment> | null = null;
  // Number, unique ID. Not a constructor argument.
  entityId: number | null = null;
  constructor(points: Array<Point>) {
    this.points = points;
  }
  // Create from a list of `Point`s. Primarily creates the drawn `Path`.
  draw = () => {
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
    this.drawing = two.makePath(...coords);
    theCanvas.wireLayer.add(this.drawing);
    // Set the wire style
    wireStyle(this.drawing);

    if (this.highlighted) {
      this.highlight();
    }
  };
  // Abort drawing an in-progress wire.
  abort = () => {
    this.drawing?.remove();
    // theCanvas.wireLayer.remove(this.drawing);
  };
  // Update styling to indicate highlighted-ness
  highlight = () => {
    if (!this.drawing) {
      return; // FIXME!
    }
    this.drawing.stroke = "red";
    this.highlighted = true;
  };
  // Update styling to indicate the lack of highlighted-ness
  unhighlight = () => {
    if (!this.drawing) {
      return; // FIXME!
    }
    this.drawing.stroke = "blue";
    this.highlighted = false;
  };
  // Boolean indication of whether `point` is inside the instance.
  hitTest = (point: Point) => {
    if (!this.segments) {
      this.calcSegments();
    }
    if (!this.segments) {
      return false; // Compiler doesn't know that `calcSegments` sets `this.segments`.
    }
    return this.segments.some((segment) => hitTestSegment(segment, point));
  };
  // Extract Manhattan segments from the wire's points.
  calcSegments = () => {
    this.segments = [];
    let [pt, ...rest] = this.points;
    for (let nxt of rest) {
      var seg;
      if (pt.x == nxt.x) {
        const start = Math.min(pt.y, nxt.y);
        const end = Math.max(pt.y, nxt.y);
        seg = {
          direction: Direction.Vert,
          at: pt.x,
          start: start,
          end: end,
        };
      } else if (pt.y == nxt.y) {
        const start = Math.min(pt.x, nxt.x);
        const end = Math.max(pt.x, nxt.x);
        seg = {
          direction: Direction.Horiz,
          at: pt.y,
          start: start,
          end: end,
        };
      } else {
        console.log("Wire segment is neither horizontal nor vertical");
        return;
      }
      this.segments.push(seg);
      pt = nxt;
    }
  };
}
