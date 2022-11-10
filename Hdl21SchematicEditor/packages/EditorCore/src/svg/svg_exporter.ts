/*
 * # SVG Exporter
 */

// Local Imports
import { SchSvgIds, SchSvgClasses } from "./svgdefs";
import * as schdata from "../schematicdata";
import { Orientation, matrix } from "../orientation";
import { toCircuitJson } from "../circuit/extractor";
import { Point, point } from "../point";
import { Place } from "../place";

// # Schematic to SVG Encoder/ Exporter
//
// NOTE: some popular SVG readers demand the <?xml> header be *the first* characters in an SVG file.
// So it's important to not add any indentation before it.
//
export class Exporter {
  // Sole constructor argument: the source Schematic
  constructor(readonly schematic: schdata.Schematic) {}

  // Output SVG text
  svg: string = "";
  // Per-indentation tab string
  readonly tab = "  ";
  // Current indentation level
  indent: number = 0;

  // Serialize a schematic to an SVG string.
  static export(schematic: schdata.Schematic): string {
    const exporter = new Exporter(schematic);
    exporter.exportSchematicSvg();
    return exporter.svg;
  }
  // Write raw text to our output string.
  write(text: string) {
    this.svg += text;
  }
  // Write a line to our SVG string, at our current indentation level.
  writeLine(line: string) {
    this.svg += this.tab.repeat(this.indent) + line + "\n";
  }
  // Serialize our schematic to our SVG string.
  exportSchematicSvg() {
    const schematic = this.schematic;

    // Write the SVG header
    // Reminder: NOTHING can come before this, or popular SVG readers fail!
    this.writeLine(`<?xml version="1.0" encoding="utf-8"?>`);
    this.writeLine(
      `<svg width="${schematic.size.x}" height="${schematic.size.y}" xmlns="http://www.w3.org/2000/svg">`
    );

    // Write the definitions section
    this.writeDefs();
    this.writeLine(`<!-- Svg Schematic Content -->\n`);

    // Write each instance
    schematic.instances.forEach((inst) => this.writeInstance(inst));
    this.writeLine("\n");

    // Write each port
    schematic.ports.forEach((port) => this.writePort(port));
    this.writeLine("\n");

    // Write each wire
    schematic.wires.forEach((wire) => this.writeWire(wire));
    this.writeLine("\n");

    // Write each dot
    schematic.dots.forEach((dot) => this.writeDot(dot));
    this.writeLine("\n");

    // And finally add the closing tag.
    this.writeLine("</svg>");
  }

  // Write the definitions section
  writeDefs() {
    // Styling is also added here, although outside the `<defs>` element.
    this.write(schematicStyle);

    // Open the `<defs>` element
    this.writeLine(`<defs id="${SchSvgIds.DEFS}">`);
    this.indent += 1;

    // Write the code prelude
    this.writePrelude();

    // Export a `Circuit`, and if successful include it in the file.
    const circuitJson = toCircuitJson(this.schematic);
    if (circuitJson.ok) {
      this.writeCircuitDef(circuitJson.val);
    } else {
      // Circuit extraction failed. Log it and carry on.
      // FIXME: some day this should be a UI message or something.
      console.log(circuitJson.val);
    }

    // Add schematic styling and background grid.
    this.write(schematicBackgroundDefs);

    // Close the `<defs>` element
    this.indent -= 1;
    this.writeLine(`</defs>`);

    // Add the background grid-filling rectangle
    this.writeLine(schematicBackground);
  }

  // Write the code prelude
  writePrelude() {
    this.writeLine(`<g id="${SchSvgIds.PRELUDE}">`);
    // Note that the prelude is split into lines, and each line *is not* indented.
    // This may be significant depending on its language.
    for (let line of this.schematic.prelude.split(/\r?\n/)) {
      this.writeLine(`<text>${line}</text>`);
    }
    this.writeLine(`</g>`);
  }

  // Write the JSON-encoded content of the extracted `Circuit`.
  //
  // The structure of this definition element is:
  // ```
  // <defs id="hdl21-schematic-defs">
  //   <text id="hdl21-schematic-circuit">
  //     {"name": ..., } // JSON-encoded Circuit content
  //   </text>
  // </defs>
  // ```
  //
  writeCircuitDef(circuitJson: string) {
    this.writeLine(`<text id="${SchSvgIds.CIRCUIT}">`);
    this.indent += 1;
    this.writeLine(circuitJson);
    this.indent -= 1;
    this.writeLine(`</text>`);
  }

  // Create the SVG `<g>` group for an `Instance`.
  writeInstance(inst: schdata.Instance) {
    const { primitive } = inst;
    // FIXME: return errors for unnamed stuff, rather than defaulting them
    const name = inst.name || "unnamed"; // FIXME
    const of = inst.of || "unknown"; // FIXME
    const orientationMatrix = this.formatOrientation(inst.orientation);
    this.writeLine(
      `<g class="${SchSvgClasses.INSTANCE}" transform="matrix(${orientationMatrix} ${inst.loc.x} ${inst.loc.y})">`
    );

    // Write the symbol group
    this.indent += 1;
    this.writeLine(`<g class="${primitive.svgTag}">`);
    this.indent += 1;
    // Write its symbol SVG content
    primitive.svgLines.forEach((line) => this.writeLine(line));
    // Write each of its Instance ports
    primitive.ports.forEach((port) => this.writeInstancePort(port.loc));
    this.indent -= 1;
    this.writeLine(`</g>`);

    // Write the name and of strings
    const nameloc = this.formatLoc(primitive.nameloc);
    this.writeLine(
      `<text ${nameloc} class="${SchSvgClasses.INSTANCE_NAME}">${name}</text>`
    );
    const ofloc = this.formatLoc(primitive.ofloc);
    this.writeLine(
      `<text ${ofloc} class="${SchSvgClasses.INSTANCE_OF}">${of}</text>`
    );

    // Close the instance group
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Create the SVG `<g>` group for a `Port`.
  writePort(port: schdata.Port) {
    const { portsymbol } = port;
    // FIXME: return errors for unnamed stuff, rather than defaulting them
    const name = port.name || "unnamed"; // FIXME
    const orientationMatrix = this.formatOrientation(port.orientation);
    this.writeLine(
      `<g class="${SchSvgClasses.PORT}" transform="matrix(${orientationMatrix} ${port.loc.x} ${port.loc.y})">`
    );
    this.indent += 1;

    // Write the symbol group
    this.writeLine(`<g class="${portsymbol.svgTag}">`);
    this.indent += 1;
    // Write its symbol SVG content
    portsymbol.svgLines.forEach((line) => this.writeLine(line));

    // Write its Instance-port circle at its origin.
    this.writeInstancePort(point.new(0, 0));
    // Close the symbol group
    this.indent -= 1;
    this.writeLine(`</g>`);

    // Write the port name
    const loc = this.formatLoc(portsymbol.nameloc);
    this.writeLine(
      `<text ${loc} class="${SchSvgClasses.PORT_NAME}">${name}</text>`
    );

    // Close the instance group
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Create the SVG `<g>` element for a `Wire`, including its path and wire-name.
  writeWire(wire: schdata.Wire) {
    if (!wire.points) {
      return;
    }
    // Open the wire group
    this.writeLine(`<g class="${SchSvgClasses.WIRE}">`);
    this.indent += 1;

    const [first, ...rest] = wire.points;
    let path = `<path class="${SchSvgClasses.WIRE}" d="M ${first.x} ${first.y}`;
    for (let p of rest) {
      path += ` L ${p.x} ${p.y}`;
    }
    path += `" />`;
    this.writeLine(path);
    this.writeLine(
      `<text visibility="hidden" class="${SchSvgClasses.WIRE_NAME}">FIXME</text>`
    );

    // Close the wire group
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Write the SVG `circle` element for a `Dot`.
  writeDot(dot: Point) {
    this.writeLine(
      `<circle cx="${dot.x}" cy="${dot.y}" r="6" class="${SchSvgClasses.DOT}" />`
    );
  }
  // Write the SVG `circle` element for an Instance port.
  // Note only the `loc`(ation) `Point` is provided as an argument.
  writeInstancePort(loc: Point) {
    this.writeLine(
      `<circle cx="${loc.x}" cy="${loc.y}" r="4" class="${SchSvgClasses.INSTANCE_PORT}" />`
    );
  }
  // Format a `Place` to an SVG matrix transform string.
  formatPlace(place: Place): string {
    const { loc, orientation } = place;
    const mat = matrix.fromOrientation(orientation);
    return `transform="matrix(${mat.a} ${mat.b} ${mat.c} ${mat.d} ${loc.x} ${loc.y})">`;
  }
  // Produce the SVG `x` and `y` attributes for a `Point` location.
  formatLoc(loc: Point): string {
    return ` x="${loc.x}" y="${loc.y}" `;
  }
  // Produce the SVG `transform` matrix string for an `Orientation`.
  formatOrientation(orientation: Orientation): string {
    const mat = matrix.fromOrientation(orientation);
    return `${mat.a} ${mat.b} ${mat.c} ${mat.d}`;
  }
}

// The schematic SVG / CSS style classes.
const schematicStyle = `
<style id="${SchSvgIds.STYLE}">

/* Styling for Symbol and Wire Elements */
.hdl21-symbols {
  fill: none;
  stroke: black;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 10px;
  stroke-dashoffset: 0px;
}

.hdl21-instance-port {
  fill: white;
  stroke: black;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4px;
  stroke-dashoffset: 0px;
}

.hdl21-dot {
  fill: blue;
  stroke: blue;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4px;
  stroke-dashoffset: 0px;
}

.hdl21-wire {
  fill: none;
  stroke: blue;
  stroke-opacity: 1;
  stroke-miterlimit: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 10px;
  stroke-dashoffset: 0px;
}

/* Styling for Text Labels */
.hdl21-labels,
.hdl21-instance-name,
.hdl21-instance-of,
.hdl21-port-name,
.hdl21-wire-name {
  fill: black;
  font-family: Menlo, Monaco, 'Courier New', monospace;
  font-weight: bold;
  font-size: 16px;
}

/* Dark Mode Color Overrides */
@media (prefers-color-scheme:dark) {
    svg {
        background-color: #1e1e1e;
    }
    .hdl21-dot {
        fill: #87d3f8;
        stroke: #87d3f8;
    }
    .hdl21-wire {
        stroke: #87d3f8;
    }
    .hdl21-symbols {
        stroke: lightgrey;
    }
    .hdl21-labels,
    .hdl21-port-name,
    .hdl21-instance-name,
    .hdl21-instance-of,
    .hdl21-wire-name {
        fill: lightgrey;
    }
}
</style>
`;

const schematicBackgroundDefs = `
    <!-- Grid Background -->
    <pattern id="${SchSvgIds.GRID_MINOR}" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" stroke-width="0.5"/>
    </pattern>
    <pattern id="${SchSvgIds.GRID_MAJOR}" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#${SchSvgIds.GRID_MINOR})"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
    </pattern>
`;

const schematicBackground = `
<rect id="${SchSvgIds.BACKGROUND}" width="100%" height="100%" fill="url(#${SchSvgIds.GRID_MAJOR})" stroke="gray" stroke-width="1"/>
`;
