import { Text } from "two.js/src/text";
import { Group } from "two.js/src/group";
import { Vector } from "two.js/src/vector";

// Local Imports
import { Bbox, bbox } from "./bbox";
import { Label, LabelKind, LabelParent } from "./label";
import { EntityKind, EntityInterface } from "./entity";
import { symbolStyle, instacePortStyle } from "./style";
import * as schdata from "../schematicdata";
import { Place } from "../place";
import { Point, point } from "../point";
import { Rotation } from "../orientation";
import { theCanvas } from "./canvas";
import { exhaust } from "../errors";

// FIXME! fill these guys in
export class InstancePort implements EntityInterface {
  entityKind: EntityKind.InstancePort = EntityKind.InstancePort;
  entityId: number | null = null;
  bbox: Bbox = bbox.empty();
  highlighted: boolean = false;
  constructor() {}

  // Create and add the drawn, graphical representation
  draw() {}
  // Update styling to indicate highlighted-ness
  highlight() {}
  // Update styling to indicate the lack of highlighted-ness
  unhighlight() {}
  // Boolean indication of whether `point` is inside the instance.
  hitTest(point: Point) {
    return false;
  }
  // Abort an in-progress instance.
  abort() {}
}

// Recursively traverse a node with a list of `children`, applying `fn` to each node.
// Typing of this largely evades us, as the `children` array is of the `any` type.
const traverseAndApply = (node: any, fn: (node: any) => void): void => {
  fn(node);
  if (node.children) {
    for (let child of node.children) {
      traverseAndApply(child, fn);
    }
  }
};

// Apply rotation. Note two.js applies rotation *clockwise*,
// hence the negation of 90 and 270 degrees.
const radianRotation = (rotation: Rotation): number => {
  switch (rotation) {
    case Rotation.R0:
      return 0;
    case Rotation.R90:
      return -Math.PI / 2;
    case Rotation.R180:
      return Math.PI;
    case Rotation.R270:
      return Math.PI / 2;
    default:
      throw exhaust(rotation);
  }
};

function svgSymbolDrawing(svgLines: Array<string>): Group {
  // Load the symbol as a two `Group`, wrapping the content in <svg> elements.
  let symbolSvgStr = "<svg>" + svgLines.join() + "</svg>";
  const symbol = theCanvas.two.load(symbolSvgStr, doNothing);
  traverseAndApply(symbol, symbolStyle);
  return symbol;
}

function svgInstancePortDrawing(loc: Point): Group {
  // FIXME: this can probably become a native `Two.Circle` instead.
  const svgStr =
    "<svg>" +
    `<circle cx="${loc.x}" cy="${loc.y}" r="4" class="hdl21-instance-port" />` +
    "</svg>";
  const group = theCanvas.two.load(svgStr, doNothing);
  traverseAndApply(group, instacePortStyle);
  return group;
}

// Apply placement, rotation, and reflection to `group`.
function placeDrawingGroup(group: Group, place: Place) {
  // Apply our vertical flip if necessary, via a two-dimensional `scale`-ing.
  group.scale = 1;
  if (place.orientation.reflected) {
    group.scale = new Vector(1, -1);
  }
  group.rotation = radianRotation(place.orientation.rotation);
  group.translation.set(place.loc.x, place.loc.y);
}

// Shared Drawing Object, used by both `Instance` and `Port`
//
// Note *everything* in here is a two.js object - none of our own classes, which often have references to them.
// These `Drawing`s are replaced regularly on the same `Instance` and `Port` objects;
// they should not be used for identity operations refering to their parents.
//
class Drawing {
  constructor(
    public root: Group, // Root-level group, including all content
    public symbol: Group, // Symbol group
    public ports: Group, // Group of instance ports
    public labelGroup: Group // Group of Label drawings
  ) {}
  // Create an empty Drawing
  static empty(): Drawing {
    return new Drawing(new Group(), new Group(), new Group(), new Group());
  }
  // Create a `Drawing` from data
  static create(data: DrawingData): Drawing {
    const { symbolSvgLines, portLocs, place } = data;

    // Create the Instance's drawing-Group, which includes its symbol, labels, and ports.
    const root = new Group();
    theCanvas.instanceLayer.add(root);

    // Draw and add the symbol sub-group
    const symbol = svgSymbolDrawing(symbolSvgLines);
    root.add(symbol);

    // Create a Group for the instance ports, draw and add each.
    const ports = new Group();
    root.add(ports);
    for (let loc of portLocs) {
      ports.add(svgInstancePortDrawing(loc));
    }

    // Add an initially empty label group to the root group.
    // Labels differ between users, and are added after the fact.
    const labelGroup = new Group();
    root.add(labelGroup);

    // Apply placement, rotation, and reflection.
    placeDrawingGroup(root, place);

    // Collect all these parts into a `Drawing`, and return it.
    return new Drawing(root, symbol, ports, labelGroup);
  }
  highlight = () => {
    traverseAndApply(this.symbol, (node: any) => {
      node.stroke = "red";
    });
    traverseAndApply(this.ports, (node: any) => {
      node.stroke = "red";
    });
  };
  unhighlight = () => {
    traverseAndApply(this.symbol, (node: any) => {
      node.stroke = "black";
    });
    traverseAndApply(this.ports, (node: any) => {
      node.stroke = "black";
    });
  };
}

// Data required to create a `Drawing`
interface DrawingData {
  symbolSvgLines: Array<string>;
  portLocs: Array<Point>;
  place: Place;
}

// Base Class shared by `Instance` and `SchPort`
abstract class InstancePortBase implements LabelParent {
  constructor(
    public drawing: Drawing // Drawing data
  ) {}

  labelMap: Map<LabelKind, Label> = new Map(); // Map from Label kinds to Labels
  entityId: number | null = null; // Numeric unique ID
  bbox: Bbox = bbox.empty(); // Bounding Box
  highlighted: boolean = false;

  abstract createLabels(): void; // Create all Labels
  abstract drawingData(): DrawingData; // Get data for drawing

  // Draw the Instance's `drawing`.
  draw = () => {
    // Remove the old drawing
    this.drawing.root.remove();

    // Draw our primary symbol and ports content
    this.drawing = Drawing.create(this.drawingData());

    // Draw the labels, which require separate adding into the drawing
    // Note updating the parent bounding box must be done *first*(!) for their bounding boxes to work.
    this.updateBbox();
    this.drawLabels();

    if (this.highlighted) {
      this.highlight();
    }
  };
  // Get references to our child `Label`s.
  labels = (): Array<Label> => {
    return Array.from(this.labelMap.values());
  };
  // Draw each of our child `Label`s.
  drawLabels = () => {
    this.labels().map((label) => label.draw());
  };
  highlight = () => {
    this.drawing.highlight();
    for (let label of this.labelMap.values()) {
      label.highlight();
    }
    this.highlighted = true;
  };
  unhighlight = () => {
    this.drawing.unhighlight();
    for (let label of this.labelMap.values()) {
      label.unhighlight();
    }
    this.highlighted = false;
  };
  removeDrawing = () => {
    this.drawing.root.remove();
  };
  // Abort drawing an in-progress instance.
  abort = () => {
    this.drawing.root.remove();
  };
  // Boolean indication of whether `point` is inside the Instance's bounding box.
  hitTest(point: Point) {
    return bbox.hitTest(this.bbox, point);
  }
  updateBbox = () => {
    // Set the bounding box for hit testing.
    // Note this must come *after* the drawing is added to the scene.
    // And note we use the *symbol* bounding box, not the overall drawing's,
    // which might include some long text labels.
    this.bbox = bbox.get(this.drawing.symbol);
  };
  // The `LabelParent` interface
  abstract updateLabelText: (label: Label) => void;
  addLabelDrawing(textElem: Text): void {
    this.drawing.labelGroup.add(textElem);
  }
}

// # Schematic Instance
//
// Combination of the Instance data and drawn visualization.
//
export class Instance extends InstancePortBase implements EntityInterface {
  constructor(
    public data: schdata.Instance, // Instance data
    public drawing: Drawing // Drawing data
  ) {
    super(drawing);
  }

  entityKind: EntityKind.Instance = EntityKind.Instance;

  static create(data: schdata.Instance): Instance {
    const instance = new Instance(data, Drawing.empty());
    instance.createLabels();
    instance.draw();
    return instance;
  }
  override drawingData(): DrawingData {
    const { data } = this;
    const { primitive, loc, orientation } = data;
    return {
      symbolSvgLines: primitive.svgLines,
      portLocs: primitive.ports.map((p) => p.loc),
      place: { loc, orientation },
    };
  }
  override createLabels = () => {
    const { primitive } = this.data;
    // Create and add the instance-name Label
    const nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: primitive.nameloc,
      parent: this,
    });
    this.drawing.labelGroup.add(nameLabel.drawing);
    this.labelMap.set(LabelKind.Name, nameLabel);

    // Create and add the instance-of Label
    const ofLabel = Label.create({
      text: this.data.of,
      kind: LabelKind.Of,
      loc: primitive.ofloc,
      parent: this,
    });
    this.drawing.labelGroup.add(ofLabel.drawing);
    this.labelMap.set(LabelKind.Of, ofLabel);
  };
  // Update the string-value from a `Label`.
  override updateLabelText = (label: Label) => {
    const { kind } = label;
    switch (kind) {
      case LabelKind.Name:
        this.data.name = label.text;
        return;
      case LabelKind.Of:
        this.data.of = label.text;
        return;
      default:
        throw exhaust(kind);
    }
  };
}

// # Schematic Port
//
// An instance-like object with a drawing and location,
// which annotates a net as being externally accessible.
//
export class SchPort
  extends InstancePortBase
  implements EntityInterface, LabelParent
{
  constructor(public data: schdata.Port, public drawing: Drawing) {
    super(drawing);
  }

  entityKind: EntityKind.SchPort = EntityKind.SchPort;

  static create(data: schdata.Port): SchPort {
    const port = new SchPort(data, Drawing.empty());
    port.createLabels();
    port.draw();
    return port;
  }
  override drawingData(): DrawingData {
    const { data } = this;
    const { portsymbol, loc, orientation } = data;
    return {
      symbolSvgLines: portsymbol.svgLines,
      portLocs: [point(0, 0)], // Include the implicit port at the origin
      place: { loc, orientation },
    };
  }
  override createLabels = () => {
    const { portsymbol } = this.data;

    // Create and add the name Label
    const nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: portsymbol.nameloc,
      parent: this,
    });
    this.drawing.labelGroup.add(nameLabel.drawing);
    this.labelMap.set(LabelKind.Name, nameLabel);
  };
  // Update the string-value from a `Label`.
  override updateLabelText = (label: Label) => {
    if (label.kind === LabelKind.Name) {
      this.data.name = label.text;
    } else {
      console.log("Unknown label kind");
    }
  };
}

// A do-nothing callback function, used in a few places that insist on calling back.
function doNothing() {}
