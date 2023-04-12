//
// # SVG Exporter
//

// Local Imports
import {
  SchSvgIds,
  SchSvgClasses,
  SvgPortPrefix,
  SvgElementPrefix,
} from "./svgdefs";
import { toCircuitJson } from "../circuit";
import {
  Schematic,
  Instance,
  Port,
  Wire,
  matrix,
  reflect,
  Point,
  point,
  Place,
  TextOrientation,
  labelOrientation,
  TextAlign,
} from "../schematic";

// # Schematic to SVG Encoder/ Exporter
//
// NOTE: some popular SVG readers demand the <?xml> header be *the first* characters in an SVG file.
// So it's important to not add any indentation before it.
//
export class Exporter {
  // Output SVG text
  svg: string = "";
  // Per-indentation tab string
  readonly tab = "  ";
  // Current indentation level
  indent: number = 0;

  // Serialize a schematic to an SVG string.
  static export(schematic: Schematic): string {
    const exporter = new Exporter();
    exporter.exportSchematicSvg(schematic);
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
  // Serialize a schematic to our SVG string.
  exportSchematicSvg(schematic: Schematic) {
    // Write the SVG header
    // Reminder: NOTHING can come before this, or popular SVG readers fail!
    this.writeLine(`<?xml version="1.0" encoding="utf-8"?>`);
    this.writeLine(
      `<svg width="${schematic.size.x}" height="${schematic.size.y}" xmlns="http://www.w3.org/2000/svg">`
    );

    // Write the definitions section
    this.writeDefs(schematic);
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
  writeDefs(schematic: Schematic) {
    // Styling is also added here, although outside the `<defs>` element.
    this.write(schematicStyle);

    // Open the `<defs>` element
    this.writeLine(`<defs id="${SchSvgIds.DEFS}">`);
    this.indent += 1;

    // Write the code prelude
    this.writePrelude(schematic);

    // Export a `Circuit`, and if successful include it in the file.
    const circuitJson = toCircuitJson(schematic);
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
  writePrelude(schematic: Schematic) {
    this.writeLine(`<g id="${SchSvgIds.PRELUDE}">`);
    // Note that the prelude is split into lines, and each line *is not* indented.
    // This may be significant depending on its language.
    for (let line of schematic.prelude.split(/\r?\n/)) {
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
  writeInstance(inst: Instance) {
    const { name, of, element } = inst;
    if (!name.length) {
      throw this.fail(
        `Instance name for ${inst} must be a nonzero length string`
      );
    }
    if (!of.length) {
      throw this.fail(
        `Instance 'of' field for ${inst} must be a nonzero length string`
      );
    }

    // Write its `Place` as an SVG matrix-transform
    const transform = this.formatPlace({
      loc: inst.loc,
      orientation: inst.orientation,
    });
    this.writeLine(`<g class="${SchSvgClasses.INSTANCE}" ${transform} >`);

    // Write the symbol group
    this.indent += 1;
    this.writeLine(`<g class="${SvgElementPrefix}${element.svgTag}">`);
    this.indent += 1;
    // Write its symbol SVG content
    element.symbol.svgLines.forEach((line) => this.writeLine(line));
    // Write each of its Instance ports
    element.symbol.ports.forEach((port) => this.writeInstancePort(port.loc));
    this.indent -= 1;
    this.writeLine(`</g>`);

    // Write the instance-name label
    const nameLabel = {
      text: name,
      loc: element.nameloc,
      className: SchSvgClasses.INSTANCE_NAME,
      orient: labelOrientation(inst.orientation),
    };
    this.writeLabel(nameLabel);

    // Write the instance-of label
    const ofLabel = {
      text: of,
      loc: element.ofloc,
      className: SchSvgClasses.INSTANCE_OF,
      orient: labelOrientation(inst.orientation),
    };
    this.writeLabel(ofLabel);

    // Close the instance group
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Create the SVG `<g>` group for a `Port`.
  writePort(port: Port) {
    const { name, portElement } = port;
    if (!name.length) {
      throw this.fail(
        `Instance name for ${port} must be a nonzero length string`
      );
    }

    const transform = this.formatPlace({
      loc: port.loc,
      orientation: port.orientation,
    });
    this.writeLine(`<g class="${SchSvgClasses.PORT}" ${transform} >`);
    this.indent += 1;

    // Write the symbol group
    this.writeLine(`<g class="${SvgPortPrefix}${portElement.svgTag}">`);
    this.indent += 1;
    // Write its symbol SVG content
    portElement.symbol.svgLines.forEach((line) => this.writeLine(line)); // FIXME: make a `writeSymbol` or similar

    // Write its Instance-port circle at its origin.
    this.writeInstancePort(point.new(0, 0));
    // Close the symbol group
    this.indent -= 1;
    this.writeLine(`</g>`);

    // Write the port name
    const nameLabel = {
      text: name,
      loc: portElement.nameloc,
      className: SchSvgClasses.PORT_NAME,
      orient: labelOrientation(port.orientation),
    };
    this.writeLabel(nameLabel);

    // Close the instance group
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Write an SVG text label.
  writeLabel(label: SvgTextLabel) {
    const { text, loc, className, orient } = label;
    const anchor = orient.alignment === TextAlign.Left ? "start" : "end";
    const orientation = reflect.toOrientation(orient.reflect);
    const place = { orientation, loc };
    const transform = this.formatPlace(place);
    this.writeLine(
      `<text class="${className}" text-anchor="${anchor}" ${transform} >${text}</text>`
    );
  }
  // Create the SVG `<g>` element for a `Wire`, including its path and wire-name.
  writeWire(wire: Wire) {
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

    // FIXME/ TBC: wire names
    const name = ""; // wire.name;
    this.writeLine(
      `<text visibility="hidden" class="${SchSvgClasses.WIRE_NAME}">${name}</text>`
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
    return `transform="matrix(${mat.a} ${mat.b} ${mat.c} ${mat.d} ${loc.x} ${loc.y})"`;
  }
  // Error handling helper
  fail(msg: string): Error {
    return new Error(msg);
  }
}

// # SVG Text Label Element
interface SvgTextLabel {
  text: string; // The text to write
  loc: Point; // Location
  className: SchSvgClasses; // SVG class
  orient: TextOrientation; // Text orientation & alignment
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
