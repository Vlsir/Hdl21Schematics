/* 
 * # SVG Import & Export
 * 
 * SVG format parsing & conversion to & from `Schematic` objects.
 */

import { parse as svgparse } from 'svg-parser';

// Local Imports
import { Point } from "./point";
import * as sch from "./schematic";
import { PrimitiveMap, PrimitiveTags } from "./primitive";


// # Schematic SVG Importer
// 
export class Importer {
    constructor() {
        this.schematic = new sch.Schematic();
        this.otherSvgElements = [];
    }
    // Import a schematic SVG string to a `Schematic`. 
    // Creates an Importer and recursively traverses the SVG tree.
    static import = svgstring => /* Schematic */ {
        const me = new Importer();
        const svgDoc = svgparse(svgstring);
        return me.importSvgDoc(svgDoc);
    };
    importSvgDoc = svgDoc => {
        // FIXME: handle case where there's stuff other than <svg> in the document.
        const svg = svgDoc.children[0];
        console.log(svg);

        const width = svg.properties.width || 1600;
        const height = svg.properties.height || 800;
        this.schematic.size = new Point(width, height);

        // Walk its SVG children, adding HDL elements. 
        for (const child of svg.children) {
            if (child.type === 'element' && child.tagName === 'g') {

                if (child.properties.class === "hdl21-instance") {
                    this.importInstance(child);
                } else if (child.properties.class === "hdl21-wire") {
                    this.importWire(child);
                } else {
                    this.addOtherSvgElement(child);
                }

            } else {
                this.addOtherSvgElement(child);
            }
        }
        if (this.otherSvgElements) {
            console.log("Non-schematic SVG elements:");
            console.log(this.otherSvgElements);
        }
        return this.schematic;
    };
    // Import an instance
    importInstance = svgGroup => {
        const transform = svgGroup.properties.transform;
        if (!transform) {
            throw new Error(`Instance ${svgGroup.properties.id} has no transform`);
        }
        const [loc, orientation] = this.importTransform(transform);

        if (svgGroup.children.length !== 3) {
            throw new Error(`Instance ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the three children: the symbol, instance name, and instance-of string.
        const [symbolGroup, nameElem, ofElem] = svgGroup.children;

        // Get the symbol type from the symbol group.
        const svgTag = symbolGroup.properties.class;
        const prim = PrimitiveTags.get(svgTag);
        if (!prim) {
            console.log(svgTag);
            throw new Error(`Unknown symbol type: ${svgTag}`);
        }
        const { kind } = prim;

        // Get the instance name.
        if (nameElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;

        // Get the instance-of string.
        if (ofElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const of = ofElem.children[0].value;

        // Create and add the instance 
        // const instance = new sch.Instance({ name: name, of: of, kind: kind, loc: loc, orientation: orientation });
        const instance = new sch.Instance(name, of, kind, loc, orientation);
        this.schematic.instances.push(instance);
    };
    // Import an SVG `transform` to a location `Point` and an `Orientation`. 
    importTransform = transform => {
        // Start splitting up the `transform` string.
        const splitParens = transform.split(/\(|\)/);
        if (splitParens.length !== 3 || splitParens[0] !== 'matrix') {
            throw new Error(`Invalid transform: ${transform}`);
        }

        // Split the numeric section, hopefully into six values 
        const numbers = splitParens[1].split(/\,|\s/).map(s => parseInt(s));
        if (numbers.length !== 6) {
            throw new Error(`Invalid transform: ${transform}`);
        }

        // Get the (x, y) position 
        const x = numbers[4];
        const y = numbers[5];
        const loc = new Point(x, y);

        // And sort out orientation from the first four numbers
        const m = numbers.slice(0, 4);
        const matrix = new sch.OrientationMatrix(m[0], m[1], m[2], m[3]);
        return [loc, sch.Orientation.fromMatrix(matrix)];
    };
    // Import a wire group
    importWire = svgGroup => {
        if (svgGroup.children.length !== 2) {
            throw new Error(`Wire ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the two children: the path and the wire name
        const [pathElem, nameElem] = svgGroup.children;

        // Get the points from the path element.
        const pathData = pathElem.properties.d;
        const pathSplit = pathData.split(/\s/);
        if (pathSplit[0] !== "M") {
            throw new Error(`Wire ${svgGroup.properties.id} has invalid path data`);
        }
        let points = [];
        for (let i = 1; i < pathSplit.length; i += 3) {
            const x = parseInt(pathSplit[i]);
            const y = parseInt(pathSplit[i + 1]);
            points.push(new Point(x, y));
        }

        // Get the wire name.
        if (nameElem.tagName !== "text") {
            throw new Error(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;
        // FIXME: actually store it! 

        // Create and add the wire
        const wire = new sch.Wire(points);
        this.schematic.wires.push(wire);
    };
    importPort = svgGroup => {
        console.log("FIXME!");
    };
    // Add an element to the "other", non-schematic elements list.
    addOtherSvgElement = svgElement => {
        console.log(`other elem:`);
        console.log(svgElement);
        this.otherSvgElements.push(svgElement);
    };
}


// Serialize a schematic to an SVG string.
export function serialize(schematic) {

    let svg = `<?xml version="1.0" encoding="utf-8"?>
    <svg width="${schematic.size.x}" height="${schematic.size.y}" xmlns="http://www.w3.org/2000/svg">`;

    // Add schematic styling.
    svg += `
    
    <defs>
        <!-- Grid Background -->
        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)"/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
        </pattern>
    </defs>
    <rect id="hdl21-schematic-grid" width="100%" height="100%" fill="url(#grid)" stroke="gray" stroke-width="1"/>

    ${schematicStyle}
    <!-- Svg Schematic Content -->\n`;

    // Create the SVG `<g>` group for an `Instance`. 
    const instanceSvg = inst => {
        const primitive = PrimitiveMap.get(inst.kind);
        if (!primitive) {
            console.log(inst);
            throw new Error(`No primitive for ${inst}`);
        }
        const name = inst.name || 'unnamed';
        const of = inst.of || 'unknown';
        return `
        <g class="hdl21-instance" transform="matrix(1 0 0 1 ${inst.loc.x} ${inst.loc.y})">
            ${primitive.svgStr}

            <text x="${primitive.nameloc.x}" y="${primitive.nameloc.y}"  class="hdl21-instance-name">${name}</text>
            <text x="${primitive.ofloc.x}" y="${primitive.ofloc.y}" class="hdl21-instance-of">${of}</text>
        </g>`;
    }

    // Write each instance to the SVG.
    for (let inst of schematic.instances) {
        svg += instanceSvg(inst);
    }
    svg += `\n\n`;

    // Create the SVG `<g>` element for a `Wire`, including its path and wire-name. 
    const wireSvg = wire => {
        if (!wire.points) {
            return;
        }
        const [first, ...rest] = wire.points;
        let rv = `<g class="hdl21-wire"> \n    `;
        rv += `<path class="hdl21-wire" d="M ${first.x} ${first.y}`;
        for (let p of rest) {
            rv += ` L ${p.x} ${p.y}`;
        }
        rv += `" /> \n`;
        rv += `<text visibility="hidden" class="hdl21-wire-name">FIXME</text> \n`;
        rv += `</g> \n`;
        return rv;
    }

    // Write each wire to the SVG.
    for (let wire of schematic.wires) {
        svg += wireSvg(wire);
    }

    // FIXME! Add ports! Add dots!

    // And finally add the closing tag. 
    svg += '\n\n</svg>';
    console.log("Serialized:");
    console.log(svg);
    return svg;
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
