// Local Imports
import { Point } from "./point";
import { Direction } from "./direction";

// # Manhattan Segment
// Runs either horizontally or vertically in direction `dir`,
// at a constant coordinate `at` and between `start` and `end`.
export interface ManhattanSegment {
  direction: Direction;
  at: number;
  start: number;
  end: number;
}

// Boolean indication of whether `pt` intersects Segment `seg`, within tolerance `tol`.
// Tolerance can be set to zero for "exact hits", e.g. those used during connectivity extraction,
// or a nonzero value for UI-based pointer hit testing.
export function hitTestSegment(
  seg: ManhattanSegment,
  pt: Point,
  tol: number
): boolean {
  if (seg.direction === Direction.Horiz) {
    return (
      Math.abs(pt.y - seg.at) <= tol && pt.x >= seg.start && pt.x <= seg.end
    );
  }
  // Vertical segment
  return Math.abs(pt.x - seg.at) <= tol && pt.y >= seg.start && pt.y <= seg.end;
}

// Extract Manhattan segments from a list of `Point`s.
// Returns `null` if any segment is neither horizontal nor vertical.
export function calcSegments(
  points: Array<Point>
): Array<ManhattanSegment> | null {
  let segments = [];
  let [pt, ...rest] = points;
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
      // FIXME: better error case, with something like a Result type.
      console.log("Wire segment is neither horizontal nor vertical");
      return null;
    }
    segments.push(seg);
    pt = nxt;
  }
  return segments;
}
