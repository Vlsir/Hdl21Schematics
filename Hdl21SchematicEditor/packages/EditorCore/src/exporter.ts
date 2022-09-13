/*
 * # SVG Exporter
 */

// Local Imports
import * as sch from "./schematic";
import { Point } from "./point";
import { PrimitiveMap } from "./primitive";
import { PortMap } from "./portsymbol";

// # Schematic to SVG Encoder/ Exporter
export class Exporter {
  // Source Schematic
  readonly schematic: sch.Schematic;
  // Output SVG text
  svg: string = "";
  // Per-indentation tab string
  readonly tab = "  ";
  // Current indentation level
  indent: number = 0;
  // NOTE: some popular SVG readers demand the <?xml> header be *the first* characters in an SVG file.
  // So it's important to not add any indentation before it.
  constructor(schematic: sch.Schematic) {
    this.schematic = schematic;
  }
  // Serialize a schematic to an SVG string.
  static export(schematic: sch.Schematic): string {
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

    // Add schematic styling and background grid.
    this.write(schematicBackground);
    this.write(schematicStyle);
    this.writeLine(`<!-- Svg Schematic Content -->\n`);

    // Write each instance
    for (let inst of schematic.instances) {
      this.writeInstance(inst);
    }
    this.writeLine("\n");

    // Write each port
    for (let port of schematic.ports) {
      this.writePort(port);
    }
    this.writeLine("\n");

    // Write each wire
    for (let wire of schematic.wires) {
      this.writeWire(wire);
    }
    this.writeLine("\n");

    // Write each dot
    for (let dot of schematic.dots) {
      this.writeDot(dot);
    }
    this.writeLine("\n");

    // And finally add the closing tag.
    this.writeLine("</svg>");
  }
  // Create the SVG `<g>` group for an `Instance`.
  writeInstance(inst: sch.Instance) {
    const primitive = PrimitiveMap.get(inst.kind);
    if (!primitive) {
      console.log(inst);
      throw new Error(`No primitive for ${inst}`);
    }
    const name = inst.name || "unnamed";
    const of = inst.of || "unknown";
    // FIXME: orientation!
    this.writeLine(
      `<g class="hdl21-instance" transform="matrix(1 0 0 1 ${inst.loc.x} ${inst.loc.y})">`
    );

    // Write the symbol group
    this.indent += 1;
    this.writeLine(`<g class="${primitive.svgTag}">`);
    this.indent += 1;
    for (let line of primitive.svgLines) {
      this.writeLine(line);
    }
    // Write each of its Instance ports
    for (let port of primitive.ports) {
      this.writeInstancePort(port.loc);
    }
    this.indent -= 1;
    this.writeLine(`</g>`);

    this.writeLine(
      `<text x="${primitive.nameloc.x}" y="${primitive.nameloc.y}"  class="hdl21-instance-name">${name}</text>`
    );
    this.writeLine(
      `<text x="${primitive.ofloc.x}" y="${primitive.ofloc.y}" class="hdl21-instance-of">${of}</text>`
    );
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Create the SVG `<g>` group for a `Port`.
  writePort(port: sch.Port) {
    const portsymbol = PortMap.get(port.kind);
    if (!portsymbol) {
      console.log(port);
      throw new Error(`No portsymbol for ${port}`);
    }
    const name = port.name || "unnamed";
    this.writeLine(
      `<g class="hdl21-port" transform="matrix(1 0 0 1 ${port.loc.x} ${port.loc.y})">`
    );

    // Write the symbol group
    this.indent += 1;
    this.writeLine(`<g class="${portsymbol.svgTag}">`);
    this.indent += 1;
    for (let line of portsymbol.svgLines) {
      this.writeLine(line);
    }
    // Write its Instance-port circle at its origin.
    this.writeInstancePort(new Point(0, 0));
    this.indent -= 1;
    this.writeLine(`</g>`);

    this.writeLine(
      `<text x="${portsymbol.nameloc.x}" y="${portsymbol.nameloc.y}"  class="hdl21-port-name">${name}</text>`
    );
    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Create the SVG `<g>` element for a `Wire`, including its path and wire-name.
  writeWire(wire: sch.Wire) {
    if (!wire.points) {
      return;
    }
    this.writeLine(`<g class="hdl21-wire">`);
    this.indent += 1;

    const [first, ...rest] = wire.points;
    let path = `<path class="hdl21-wire" d="M ${first.x} ${first.y}`;
    for (let p of rest) {
      path += ` L ${p.x} ${p.y}`;
    }
    path += `" />`;
    this.writeLine(path);
    this.writeLine(
      `<text visibility="hidden" class="hdl21-wire-name">FIXME</text>`
    );

    this.indent -= 1;
    this.writeLine(`</g>`);
  }
  // Write the SVG `circle` element for a `Dot`.
  writeDot(dot: Point) {
    this.writeLine(
      `<circle cx="${dot.x}" cy="${dot.y}" r="4" class="hdl21-dot" />`
    );
  }
  // Write the SVG `circle` element for an Instance port.
  // Note only the `loc`(ation) `Point` is provided as an argument.
  writeInstancePort(loc: Point) {
    this.writeLine(
      `<circle cx="${loc.x}" cy="${loc.y}" r="4" class="hdl21-instance-port" />`
    );
  }
}

// The schematic SVG / CSS style classes.
const schematicStyle = `
<style>

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
  fill: black;
  stroke: black;
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
  font-family: comic sans ms;
  /* We know, it's just too funny */
  font-size: 16px;
}

/* Dark Mode Color Overrides */
@media (prefers-color-scheme:dark) {
    svg {
        background-color: #1e1e1e;
    }
    .hdl21-wire {
        stroke: #87d3f8;
    }
    .hdl21-symbols {
        stroke: darkgrey;
    }
    .hdl21-labels,
    .hdl21-instance-name,
    .hdl21-instance-of,
    .hdl21-wire-name {
        fill: grey;
    }
}
</style>
`;

const schematicBackground = `
<defs>
    <!-- Grid Background -->
    <pattern id="hdl21-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" stroke-width="0.5"/>
    </pattern>
    <pattern id="hdl21-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#hdl21-grid-minor)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
    </pattern>
</defs>
<rect id="hdl21-background" width="100%" height="100%" fill="url(#hdl21-grid-major)" stroke="gray" stroke-width="1"/>
`;
