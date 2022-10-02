/*
 * # Schematics Styling
 *
 * In the two.js API's terms.
 */

import { Path } from "two.js/src/path";
import { Group } from "two.js/src/group";
import { Text } from "two.js/src/text";
import { Line } from "two.js/src/shapes/line";

export enum ColorTheme {
  Light = "light",
  Dark = "dark",
}

// Apply the `hdl21-wire` styling in two.js terms
export function wireStyle(
  wire: Path,
  highlighted: boolean = false,
  theme: ColorTheme = ColorTheme.Light
): Path {
  wire.visible = true;
  wire.closed = false;
  wire.noFill();
  wire.stroke = "blue";
  wire.linewidth = 10;
  wire.cap = "round";
  wire.join = "round";
  return wire;
}

// Apply the `hdl21-symbols` styling in two.js terms
export function symbolStyle(
  symbol: Group,
  highlighted: boolean = false
): Group {
  symbol.noFill();
  symbol.stroke = "black";
  symbol.linewidth = 10;
  symbol.cap = "round";
  symbol.join = "round";
  return symbol;
}

// Apply the `hdl21-instance-port` styling in two.js terms
export function instacePortStyle(
  port: Group,
  highlighted: boolean = false
): Group {
  port.fill = "white"; // FIXME: dark mode
  port.stroke = "black";
  port.linewidth = 4;
  port.cap = "round";
  port.join = "round";
  return port;
}

// Apply the `hdl21-labels` styling in two.js terms
export function labelStyle(textElem: Text, highlighted: boolean = false): Text {
  textElem.alignment = "left";
  textElem.family = "Comic Sans MS";
  textElem.style = "heavy";
  textElem.size = 16;
  if (highlighted) {
    textElem.stroke = "red";
    textElem.fill = "red";
  } else {
    textElem.noStroke();
    textElem.fill = "black";
  }
  return textElem;
}

// Apply the grid-line styling
export function gridLineStyle(line: Line, isMajor: boolean): Line {
  line.stroke = "gray";
  line.visible = true;
  line.closed = false;
  line.noFill();
  if (isMajor) {
    line.linewidth = 1;
  } else {
    line.linewidth = 0.5;
  }
  return line;
}
