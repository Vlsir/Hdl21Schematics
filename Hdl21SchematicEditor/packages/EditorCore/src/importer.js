/* 
 * # SVG Importer
 * 
 * SVG format parsing & conversion to `Schematic` objects.
 */

import { parse as svgparse } from 'svg-parser';

// Local Imports
import { point } from "./point";
import { Schematic, Orientation, OrientationMatrix } from "./schematicdata";
import { PrimitiveKind, PrimitiveTags } from "./primitive";
import { PortTags } from "./portsymbol";


// # Schematic SVG Importer
// 
export class Importer {
    constructor() {
        this.schematic = new Schematic();
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
        this.schematic.size = point(width, height);

        // Walk its SVG children, adding HDL elements. 
        for (const child of svg.children) {
            if (child.type === 'element' && child.tagName === 'g') {

                if (child.properties.class === "hdl21-instance") {
                    this.importInstance(child);
                } else if (child.properties.class === "hdl21-port") {
                    this.importPort(child);
                } else if (child.properties.class === "hdl21-wire") {
                    this.importWire(child);
                } else {
                    this.addOtherSvgElement(child);
                }
            } else if (child.type === 'element' && child.tagName === 'g') {
                if (child.properties.class === "hdl21-dot") {
                    this.importDot(child);
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
    importDot = svgCircle => {
        // FIXME!
        console.log("FIXME! importDot");
    }
    // Import an instance
    importInstance = svgGroup => {
        const transform = svgGroup.properties.transform;
        if (!transform) {
            throw this.fail(`Instance ${svgGroup.properties.id} has no transform`);
        }
        const [loc, orientation] = this.importTransform(transform);

        if (svgGroup.children.length !== 3) {
            throw this.fail(`Instance ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the three children: the symbol, instance name, and instance-of string.
        const [symbolGroup, nameElem, ofElem] = svgGroup.children;

        // Get the symbol type from the symbol group.
        const svgTag = symbolGroup.properties.class;
        const prim = PrimitiveTags.get(svgTag);
        if (!prim) {
            throw this.fail(`Unknown symbol type: ${svgTag}`);
        }
        const { kind } = prim;

        // Get the instance name.
        if (nameElem.tagName !== "text") {
            throw this.fail(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;

        // Get the instance-of string.
        if (ofElem.tagName !== "text") {
            throw this.fail(`Instance ${svgGroup.properties.id} has no name`);
        }
        const of = ofElem.children[0].value;

        // FIXME: a temporary "schema migration" happening here! 
        // Convert Instances of the Port-types to `Port` objects instead. 
        if (kind === PrimitiveKind.Input || kind === PrimitiveKind.Output || kind === PrimitiveKind.Inout) {
            const port = { name, kind, loc, orientation };
            this.schematic.ports.push(port);
        } else {
            // Create and add the instance 
            // const instance = new sch.Instance({ name: name, of: of, kind: kind, loc: loc, orientation: orientation });
            const instance = { name, of, kind, loc, orientation };
            this.schematic.instances.push(instance);
        }
    };
    // Import a Port
    importPort = svgGroup => {

        const transform = svgGroup.properties.transform;
        if (!transform) {
            throw this.fail(`Instance ${svgGroup.properties.id} has no transform`);
        }
        const [loc, orientation] = this.importTransform(transform);

        if (svgGroup.children.length !== 2) {
            throw this.fail(`Port group ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the two children: the symbol and port name
        const [symbolGroup, nameElem] = svgGroup.children;

        // Get the symbol type from the symbol group.
        const svgTag = symbolGroup.properties.class;
        const portsymbol = PortTags.get(svgTag);
        if (!portsymbol) {
            throw this.fail(`Unknown symbol type: ${svgTag}`);
        }
        const { kind } = portsymbol;

        // Get the port name.
        if (nameElem.tagName !== "text") {
            throw this.fail(`Port ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;

        // Create the Port and add it to the schematic.
        const port = { name, kind, loc, orientation };
        this.schematic.ports.push(port);
    };
    // Import an SVG `transform` to a location `Point` and an `Orientation`. 
    importTransform = transform => {
        // Start splitting up the `transform` string.
        const splitParens = transform.split(/\(|\)/);
        if (splitParens.length !== 3 || splitParens[0] !== 'matrix') {
            throw this.fail(`Invalid transform: ${transform}`);
        }

        // Split the numeric section, hopefully into six values 
        const numbers = splitParens[1].split(/\,|\s/).map(s => parseInt(s));
        if (numbers.length !== 6) {
            throw this.fail(`Invalid transform: ${transform}`);
        }

        // Get the (x, y) position 
        const x = numbers[4];
        const y = numbers[5];
        const loc = point(x, y);

        // And sort out orientation from the first four numbers
        const m = numbers.slice(0, 4);
        const matrix = new OrientationMatrix(m[0], m[1], m[2], m[3]);
        return [loc, Orientation.fromMatrix(matrix)];
    };
    // Import a wire group
    importWire = svgGroup => {
        if (svgGroup.children.length !== 2) {
            throw this.fail(`Wire ${svgGroup.properties.id} has ${svgGroup.children.length} children`);
        }

        // Get the two children: the path and the wire name
        const [pathElem, nameElem] = svgGroup.children;

        // Get the points from the path element.
        const pathData = pathElem.properties.d;
        const pathSplit = pathData.split(/\s/);
        if (pathSplit[0] !== "M") {
            throw this.fail(`Wire ${svgGroup.properties.id} has invalid path data`);
        }
        let points = [];
        for (let i = 1; i < pathSplit.length; i += 3) {
            const x = parseInt(pathSplit[i]);
            const y = parseInt(pathSplit[i + 1]);
            points.push(point(x, y));
        }

        // Get the wire name.
        if (nameElem.tagName !== "text") {
            throw this.fail(`Instance ${svgGroup.properties.id} has no name`);
        }
        const name = nameElem.children[0].value;
        // FIXME: actually store it! 

        // Create and add the wire
        const wire = { points };
        this.schematic.wires.push(wire);
    };
    // Add an element to the "other", non-schematic elements list.
    addOtherSvgElement = svgElement => {
        this.otherSvgElements.push(svgElement);
    };
    fail = msg => {
        return new Error(msg);
    }
}

