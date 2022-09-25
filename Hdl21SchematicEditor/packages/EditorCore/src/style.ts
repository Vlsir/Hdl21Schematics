/*
 * # Schematics Styling
 *
 * In the two.js API's terms.
 */

import { Path } from "two.js/src/path";
import { Group } from "two.js/src/group";
import { Text } from "two.js/src/text";
import { Line } from "two.js/src/shapes/line";

// Apply the `hdl21-wire` styling in two.js terms
export function wireStyle(path: Path) {
  path.visible = true;
  path.closed = false;
  path.noFill();
  path.stroke = "blue";
  path.linewidth = 10;
  path.cap = "round";
  path.join = "round";
}

// Apply the `hdl21-symbols` styling in two.js terms
export function symbolStyle(symbol: Group) {
  symbol.noFill();
  symbol.stroke = "black";
  symbol.linewidth = 10;
  symbol.cap = "round";
  symbol.join = "round";
  return symbol;
}

// Apply the `hdl21-labels` styling in two.js terms
export function labelStyle(textElem: Text) {
  /* Two.Text => void */
  textElem.alignment = "left";
  textElem.family = "Comic Sans MS";
  textElem.style = "heavy";
  textElem.size = 16;
}

// Apply the grid-line styling
export function gridLineStyle(line: Line, isMajor: boolean) {
  line.stroke = "gray";
  line.visible = true;
  line.closed = false;
  line.noFill();
  if (isMajor) {
    line.linewidth = 1;
  } else {
    line.linewidth = 0.5;
  }
}
