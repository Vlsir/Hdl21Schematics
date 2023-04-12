//
// # Schematics Styling
//
// In the two.js API's terms.
//

import { Path } from "two.js/src/path";
import { Group } from "two.js/src/group";
import { Text } from "two.js/src/text";
import { Line } from "two.js/src/shapes/line";
import { Circle } from "two.js/src/shapes/circle";

export enum ColorTheme {
  Light = "light",
  Dark = "dark",
}

// Apply the `hdl21-wire` styling in two.js terms
export function wireStyle(
  wire: Path,
  highlighted: boolean = false, // FIXME!
  theme: ColorTheme = ColorTheme.Light // FIXME!
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
  highlighted: boolean = false // FIXME!
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
  port: Circle,
  highlighted: boolean = false, // FIXME!
  theme: ColorTheme = ColorTheme.Light // FIXME!
): Circle {
  port.radius = 4;
  port.fill = "white"; // FIXME: dark mode
  port.stroke = "black";
  port.linewidth = 4;
  port.cap = "round";
  port.join = "round";
  return port;
}

// Apply the `hdl21-dot` styling in two.js terms
export function dotStyle(
  circle: Circle,
  highlighted: boolean = false, // FIXME!
  theme: ColorTheme = ColorTheme.Light // FIXME!
): Path {
  circle.radius = 6;
  circle.linewidth = 4;
  circle.visible = true;
  circle.stroke = "blue";
  circle.fill = "blue";
  circle.cap = "round";
  circle.join = "round";
  return circle;
}

// Apply the `hdl21-labels` styling in two.js terms
export function labelStyle(textElem: Text, highlighted: boolean = false): Text {
  textElem.family = "Menlo, Monaco, 'Courier New', monospace";
  textElem.style = "normal";
  textElem.weight = 700; // Typical value for "bold"
  textElem.size = 16;
  textElem.noStroke();
  if (highlighted) {
    textElem.fill = "red";
  } else {
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
  // FIXME: these line-widths are halved compared to the SVG-file ones.
  // It remains unclear why the same values here vs there don't seem to render the same.
  // Perhaps these are being "double counted", somehow.
  if (isMajor) {
    line.linewidth = 0.5;
  } else {
    line.linewidth = 0.25;
  }
  return line;
}
