//
// # SVG Importer
//
// SVG format parsing & conversion to `Schematic` objects.
//

import { parse, ElementNode, TextNode } from "svg-parser";

// Local Imports
import {
  SchSvgClasses,
  SchSvgIds,
  SvgElementPrefix,
  SvgPortPrefix,
  DeprecatedPrefix,
} from "./svgdefs";
import {
  Point,
  Place,
  Schematic,
  orientation,
  matrix,
  ElementTags,
  PortTags,
} from "../schematic";

// Type alias for the return-type of `ElementNode.children()`
type Child = ElementNode | TextNode | string;

// Wrapper type around non-schematic ("other") SVG elements
export interface OtherSvgElement {
  child: Child;
}

// # Schematic SVG Importer
//
export class Importer {
  constructor(readonly svgstring: string) {}
  schematic: Schematic = Schematic.new_(); // Result Schematic
  otherSvgElements: Array<OtherSvgElement> = []; // "Other" non-Schematic SVG content

  // Import a schematic SVG string to a `Schematic`.
  // Creates an Importer and recursively traverses the SVG tree.
  static import(svgstring: string): Schematic {
    const me = new Importer(svgstring);
    return me.importSvg();
  }

  // Import an SVG root document object to a `Schematic`.
  importSvg(): Schematic {
    // Parse the SVG string into an SVG document object.
    const svgRoot = parse(this.svgstring);
    if (svgRoot.children.length !== 1) {
      throw this.fail("SVG root must have exactly one child element");
    }
    const svg = this.expectElement(svgRoot.children[0]);

    // Pull the size out of the SVG properties.
    // These can be stored as either strings or numbers; convert to numbers.
    const properties = svg.properties || {};
    let width = properties.width || 1600;
    let height = properties.height || 800;

    width = this.propToNum(width);
    height = this.propToNum(height);
    this.schematic.size = Point.new(width, height);

    // Walk its SVG children, adding schematic elements.
    for (const child of svg.children) {
      this.importSvgChild(child);
    }

    // FIXME: issue #13 convert the "other" elements into forms that the schematic can use.
    if (this.otherSvgElements.length) {
      console.log("Non-schematic SVG elements:");
      console.log(this.otherSvgElements);
    }

    return this.schematic;
  }

  // Import a child node of the "root" (OK, the "root's sole child") SVG element.
  // This is where most schematic content must be found per our schema.
  importSvgChild(child: Child) {
    if (typeof child === "string" || child.type === "text") {
      // Non `ElementNode` children are added as "other" elements.
      return this.addOtherSvgElement(child);
    }
    const elem = this.expectElement(child);
    const { tagName, properties } = elem;
    if (!tagName || !properties) {
      return this.addOtherSvgElement(elem);
    }

    // Check for schematic elements.
    if (tagName === "g" && properties.class === SchSvgClasses.INSTANCE) {
      return this.importInstance(elem);
    }
    if (tagName === "g" && properties.class === SchSvgClasses.PORT) {
      return this.importPort(elem);
    }
    if (tagName === "g" && properties.class === SchSvgClasses.WIRE) {
      return this.importWire(elem);
    }
    if (tagName === "circle" && properties.class === SchSvgClasses.DOT) {
      return this.importDot(elem);
    }

    // Check for our special elements, added to every schematic.
    const { id } = properties;
    if (tagName === "defs" && id === SchSvgIds.DEFS) {
      return this.importDefs(elem);
    }
    if (
      (tagName === "style" && id === SchSvgIds.STYLE) ||
      (tagName === "rect" && id === SchSvgIds.BACKGROUND)
    ) {
      return; // Do nothing on these.
    }

    // Fell through everything schematic-related.
    // Store this as an "other" SVG element.
    this.addOtherSvgElement(elem);
  }

  // Import the definitions block, particularly for the code prelude.
  // Throws an Error if no prelude is found.
  importDefs(defs: ElementNode) {
    for (const child of defs.children) {
      const elem = this.expectElement(child);
      const { tagName, properties } = elem;
      if (!tagName || !properties) {
        continue;
      }
      if (tagName === "g" && properties.id === SchSvgIds.PRELUDE) {
        return this.importPrelude(elem);
      }
    }
    throw this.fail("No prelude found in defs");
  }

  // Import the code-prelude group
  importPrelude(prelude: ElementNode) {
    let lines = [];
    for (const child of prelude.children) {
      const lineElem = this.expectElement(child);
      // These (valid) line elements either have zero or one children.
      // Zero if an empty line, one if a text node.

      // If it has more than one child, something went wrong.
      if (lineElem.children.length > 1) {
        throw this.fail("Prelude text element must contain only one child");
      }

      // If there is a child, it's the string, push it to the result
      if (lineElem.children.length > 0) {
        const textNode = this.expectTextNode(lineElem.children[0]);
        lines.push(textNode.value);
      }
    }
    this.schematic.prelude = lines.join("\n");
  }

  // Import a `Dot` from an SVG `<circle>` element.
  // Throws an Error if the element lacks the "dot properties" `cx` and `cy`.
  // Does not check that this is a `circle` in the first place, or that it has the `hd21-dot` class.
  importDot(svgCircle: ElementNode): void {
    const { properties } = svgCircle;
    if (!properties) {
      throw this.fail("Dot <circle> element must have properties");
    }
    const { cx, cy } = properties;
    if (cx === undefined || cy === undefined) {
      throw this.fail("Dot <circle> element must have cx and cy properties");
    }
    const x = this.propToNum(cx);
    const y = this.propToNum(cy);
    this.schematic.dots.push(Point.new(x, y));
  }

  // Import an instance
  importInstance(svgGroup: ElementNode) {
    const { properties } = svgGroup;
    if (!properties) {
      throw this.fail("Instance must have properties");
    }
    const { transform } = properties;
    if (!transform || typeof transform !== "string") {
      throw this.fail(`Instance has no transform`);
    }
    const { loc, orientation } = this.importTransform(transform);

    if (svgGroup.children.length !== 3) {
      throw this.fail(`Instance has ${svgGroup.children.length} children`);
    }

    // Get the three children: the symbol, instance name, and instance-of string.
    const [symbolChild, nameChild, ofChild] = svgGroup.children;

    // Get the symbol type from the symbol group.
    let classTag = this.importClassTag(symbolChild);

    // Peel off the prefix from the class tag.
    // FIXME: a bit of "schema migration" in renaming `elements` here
    if (classTag.startsWith(DeprecatedPrefix)) {
      classTag = classTag.substring(DeprecatedPrefix.length);
    } else if (classTag.startsWith(SvgElementPrefix)) {
      classTag = classTag.substring(SvgElementPrefix.length);
    } else {
      throw this.fail(`Unknown symbol type: ${classTag}`);
    }

    const element = ElementTags.get(classTag);
    if (!element) {
      throw this.fail(`Unknown symbol type: ${classTag}`);
    }
    const { kind } = element;

    // Extract the instance name and of-string.
    const name = this.importTextElem(nameChild);
    const of = this.importTextElem(ofChild);

    // Create and add the instance
    const instance = { name, of, kind, element, loc, orientation };
    this.schematic.instances.push(instance);
  }

  // Import a Port
  importPort(svgGroup: ElementNode) {
    const { properties } = svgGroup;
    if (!properties) {
      throw this.fail("Instance must have properties");
    }
    const { transform } = properties;
    if (!transform || typeof transform !== "string") {
      throw this.fail(`Instance has no transform`);
    }
    const { loc, orientation } = this.importTransform(transform);

    if (svgGroup.children.length !== 2) {
      throw this.fail(`Port group has ${svgGroup.children.length} children`);
    }

    // Get the two children: the symbol and port name
    const [symbolChild, nameChild] = svgGroup.children;

    // Get the symbol type from the symbol group.
    let classTag = this.importClassTag(symbolChild);

    // Peel off the prefix from the class tag.
    // FIXME: a bit of "schema migration" in renaming `elements` here
    if (classTag.startsWith(DeprecatedPrefix)) {
      classTag = classTag.substring(DeprecatedPrefix.length);
    } else if (classTag.startsWith(SvgPortPrefix)) {
      classTag = classTag.substring(SvgPortPrefix.length);
    } else {
      throw this.fail(`Unknown port type: ${classTag}`);
    }

    const portElement = PortTags.get(classTag);
    if (!portElement) {
      throw this.fail(`Unknown symbol type: ${classTag}`);
    }
    const { kind } = portElement;

    // Get the port name.
    const name = this.importTextElem(nameChild);

    // Create the Port and add it to the schematic.
    const port = { name, kind, portElement, loc, orientation };
    this.schematic.ports.push(port);
  }

  // Get the string-valued `class` property of an element.
  importClassTag(child: Child): string {
    const elem = this.expectElement(child);
    if (!elem.properties) {
      throw this.fail("Instance symbol group has no properties");
    }
    const svgTag = elem.properties.class;
    if (!svgTag || typeof svgTag !== "string") {
      throw this.fail(`Instance has no class`);
    }
    return svgTag;
  }

  // Import an SVG `transform` to a location `Point` and an `Orientation`.
  importTransform(transform: string): Place {
    // Start splitting up the `transform` string.
    const splitParens = transform.split(/\(|\)/);
    if (splitParens.length !== 3 || splitParens[0] !== "matrix") {
      throw this.fail(`Invalid transform: ${transform}`);
    }

    // Split the numeric section, hopefully into six values
    const numbers = splitParens[1].split(/\,|\s/).map((s) => parseInt(s));
    if (numbers.length !== 6) {
      throw this.fail(`Invalid transform: ${transform}`);
    }

    // Get the (x, y) position
    const x = numbers[4];
    const y = numbers[5];
    const loc = Point.new(x, y);

    // And sort out orientation from the first four numbers
    const m = numbers.slice(0, 4);
    const mat = matrix.new(m[0], m[1], m[2], m[3]);
    return { loc, orientation: orientation.fromMatrix(mat) };
  }

  // Import a wire group
  importWire(svgGroup: ElementNode) {
    const { properties } = svgGroup;
    if (!properties) {
      throw this.fail(`Wire group has no properties`);
    }
    if (svgGroup.children.length !== 2) {
      throw this.fail(
        `Wire ${properties.id} has ${svgGroup.children.length} children`
      );
    }

    // Get the two children: the path and the wire name
    const [pathChild, nameChild] = svgGroup.children;

    // Get the points from the path element.
    const pathElem = this.expectElement(pathChild);
    if (!pathElem.properties) {
      throw this.fail(`Wire path has no properties`);
    }
    const pathData = pathElem.properties.d;
    if (!pathData || typeof pathData !== "string") {
      throw this.fail(`Wire path has no data`);
    }
    const pathSplit = pathData.split(/\s/);
    if (pathSplit[0] !== "M") {
      throw this.fail(`Wire ${properties.id} has invalid path data`);
    }
    let points = [];
    for (let i = 1; i < pathSplit.length; i += 3) {
      const x = parseInt(pathSplit[i]);
      const y = parseInt(pathSplit[i + 1]);
      points.push(Point.new(x, y));
    }

    // Get the wire name.
    const name = this.importTextElem(nameChild);
    // FIXME: actually store it!

    // Create and add the wire
    const wire = { points };
    this.schematic.wires.push(wire);
  }

  // Add an element to the "other", non-schematic elements list.
  addOtherSvgElement(child: Child) {
    this.otherSvgElements.push({ child });
  }

  // Get an `ElementNode` from `child`, or fail
  expectElement(child: Child): ElementNode {
    if (typeof child === "string" || child.type === "text") {
      throw this.fail(`Expected SVG Element, got ${child}`);
    }
    return child;
  }
  // Get a `TextNode` from `child`, or fail
  expectTextNode(child: Child): TextNode {
    if (typeof child === "string" || child.type === "element") {
      throw this.fail(`Expected TextNode, got ${child}`);
    }
    return child;
  }

  // Helper function for a repeated construct:
  //
  // A `Child` which is an `ElementNode`, and has a single child which is a `TextNode`,
  // and we ultimately just want the text value in that `TextNode`.
  // This is how most e.g. `Instance.name` and most other string-valued structured content works.
  //
  // Returns the empty string if the element has no children,
  // generally indicating an empty inner text element.
  importTextElem(child: Child): string {
    const elem = this.expectElement(child);
    if (elem.tagName !== "text") {
      throw this.fail(`Could not extract string from ${child}`);
    }
    if (!elem.children.length) {
      return ""; // Empty string/ no text child
    }
    const textNode = this.expectTextNode(elem.children[0]);
    const { value } = textNode;
    if (typeof value !== "string") {
      throw this.fail(`Could not extract string from ${child}`);
    }
    return value;
  }

  // Property to Number Helper Function
  // Each value in the SVG `properties` object is either a number or a string.
  // This converts string-valued ones to
  propToNum(inp: number | string): number {
    if (typeof inp === "string") {
      try {
        return parseInt(inp, 10);
      } catch (e) {
        throw this.fail(`Could not parse property value ${inp} to integer`);
      }
    }
    return inp;
  }

  // Error helper. Place for a breakpoint to capture our state.
  fail(msg: string) {
    return new Error(msg);
  }
}
