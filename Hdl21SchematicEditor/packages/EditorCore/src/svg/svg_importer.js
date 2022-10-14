/* 
 * # SVG Importer
 * 
 * SVG format parsing & conversion to `Schematic` objects.
 */

import { parse as svgparse } from 'svg-parser';

// Local Imports
import { SchSvgClasses, SchSvgIds } from './svgdefs';
import { point } from "../point";
import { Schematic } from "../schematicdata";
import { matrix, orientation } from "../orientation";
import { PrimitiveKind, PrimitiveTags } from "../primitive";
import { PortTags } from "../portsymbol";


// # Schematic SVG Importer
// 
export class Importer {
    constructor() {
        this.schematic = new Schematic();
        this.otherSvgElements = [];
    }
    // Import a schematic SVG string to a `Schematic`. 
    // Creates an Importer and recursively traverses the SVG tree.
    static import = svgstring => { /* Schematic */
        const me = new Importer();
        const svgDoc = svgparse(svgstring);
        return me.importSvgDoc(svgDoc);
    };

    // Import an SVG root document object to a `Schematic`.
    importSvgDoc = svgDoc => {
        if (svgDoc.children.length !== 1) {
            throw this.fail("SVG document must have exactly one root element");
        }
        const svg = svgDoc.children[0];
        if (svg.tagName !== 'svg') {
            throw this.fail("SVG document root element must be <svg>");
        }

        const width = svg.properties.width || 1600;
        const height = svg.properties.height || 800;
        this.schematic.size = point(width, height);

        // Walk its SVG children, adding schematic elements. 
        for (const child of svg.children) {
            this.importSvgChild(child);
        }

        // FIXME: convert the "other" elements into forms that the schematic can use.
        if (this.otherSvgElements.length) {
            console.log("Non-schematic SVG elements:");
            console.log(this.otherSvgElements);
        }

        return this.schematic;
    };

    // Import a child node of the root SVG element.
    // This is where most schematic content must be found per our schema. 
    importSvgChild = child => {
        if (child.type !== "element") {
            console.log(`Unknown SVG element type: ${child}`);
            return this.addOtherSvgElement(child);
        }
        const { tagName, properties } = child;

        // Check for schematic elements.
        if (tagName === 'g' && properties.class === SchSvgClasses.INSTANCE) {
            return this.importInstance(child);
        }
        if (tagName === 'g' && properties.class === SchSvgClasses.PORT) {
            return this.importPort(child);
        }
        if (tagName === 'g' && properties.class === SchSvgClasses.WIRE) {
            return this.importWire(child);
        }
        if (tagName === 'circle' && properties.class === SchSvgClasses.DOT) {
            return this.importDot(child);
        }

        // Check for our special elements, added to every schematic. 
        const { id } = properties;
        if (tagName === "defs" && id === SchSvgIds.DEFS) {
            return this.importDefs(child);
        }
        if (tagName === "style" && id === SchSvgIds.STYLE
            || tagName === "rect" && id === SchSvgIds.BACKGROUND) {
            return; // Do nothing on these. 
        }

        // Fell through everything schematic-related.
        // Store this as an "other" SVG element.
        this.addOtherSvgElement(child);
    }

    // Import the definitions block, particularly for the code prelude. 
    // Throws an Error if no prelude is found.
    importDefs = defs => {
        for (const child of defs.children) {
            const { tagName, properties } = child;
            if (tagName === "g" && properties.id === SchSvgIds.PRELUDE) {
                return this.importPrelude(child);
            }
        }
        throw this.fail("No prelude found in defs");
    }

    // Import the code-prelude group 
    importPrelude = prelude => {
        let lines = [];
        for (const lineElem of prelude.children) {
            if (lineElem.tagName !== "text") {
                throw this.fail("Prelude must contain only text elements");
            }
            // If there is a child, it's the string, push it to the result 
            if (lineElem.children.length > 0) {
                lines.push(lineElem.children[0].value);
            }
            // And if there's more than one child, something went wrong. 
            if (lineElem.children.length > 1) {
                throw this.fail("Prelude text element must contain only one child");
            }
        }
        this.schematic.prelude = lines.join("\n");
    }

    // Import a `Dot`
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
        const primitive = PrimitiveTags.get(svgTag);
        if (!primitive) {
            throw this.fail(`Unknown symbol type: ${svgTag}`);
        }
        const { kind } = primitive;

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
            const instance = { name, of, kind, primitive, loc, orientation };
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
        const port = { name, kind, portsymbol, loc, orientation };
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
        const mat = matrix.new(m[0], m[1], m[2], m[3]);
        return [loc, orientation.fromMatrix(mat)];
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

    // Error helper. Place for a breakpoint to capture our state. 
    fail = msg => {
        return new Error(msg);
    }
}

