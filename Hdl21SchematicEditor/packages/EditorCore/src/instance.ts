import { Text } from "two.js/src/text";
import { Group } from "two.js/src/group";
import { Vector } from "two.js/src/vector";

// Local Imports
import { Bbox, bbox } from "./bbox";
import { Place } from "./place";
import { Point, point } from "./point";
import * as schdata from "./schematicdata";
import { Rotation } from "./orientation";
import { symbolStyle, instacePortStyle } from "./style";
import { Label, LabelKind, LabelParent } from "./label";
import { Entity, EntityKind, EntityInterface } from "./entity";
import { theCanvas } from "./canvas";
import { exhaust } from "./errors";

// FIXME! fill these guys in
export class InstancePort {}

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

function drawSymbolAndPorts(
  symbolSvgLines: Array<string>,
  portLocs: Array<Point>,
  place: Place
): Drawing {
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
  return new Drawing(root, symbol, ports, labelGroup, new Map());
}

// Shared Drawing Object
// Used by both `Instance` and `Port`
//
class Drawing {
  constructor(
    public root: Group, // Root-level group, including all content
    public symbol: Group, // Symbol group
    public ports: Group, // Group of instance ports
    public labelGroup: Group, // Group of Label drawings
    public labelMap: Map<LabelKind, Label> // Map from Label kinds to Labels
  ) {}
  highlight = () => {
    traverseAndApply(this.symbol, (node: any) => {
      node.stroke = "red";
    });
    traverseAndApply(this.ports, (node: any) => {
      node.stroke = "red";
    });
    for (let label of this.labelMap.values()) {
      label.highlight();
    }
  };
  unhighlight = () => {
    traverseAndApply(this.symbol, (node: any) => {
      node.stroke = "black";
    });
    traverseAndApply(this.ports, (node: any) => {
      node.stroke = "black";
    });
    for (let label of this.labelMap.values()) {
      label.unhighlight();
    }
  };
}

// Base Class shared by `Instance` and `SchPort`
abstract class InstancePortBase {
  constructor(
    public drawing: Drawing // Drawing data
  ) {}

  entityId: number | null = null; // Numeric unique ID
  bbox: Bbox = bbox.empty(); // Bounding Box
  highlighted: boolean = false;

  abstract labels(): Array<Label>; // Return all Labels
  abstract createLabels(): void; // Create all Labels

  highlight = () => {
    this.drawing.highlight();
    this.highlighted = true;
  };
  unhighlight = () => {
    this.drawing.unhighlight();
    this.highlighted = false;
  };
  addLabelDrawing(textElem: Text): void {
    this.drawing.labelGroup.add(textElem);
  }
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

  readonly entityKind: EntityKind = EntityKind.Instance;

  static create(data: schdata.Instance): Instance {
    const { primitive } = data;
    const drawing = drawSymbolAndPorts(
      primitive.svgLines,
      primitive.ports.map((p) => p.loc),
      { loc: data.loc, orientation: data.orientation }
    );
    const instance = new Instance(data, drawing);
    instance.updateBbox();
    instance.createLabels();
    return instance;
  }
  // Get references to our child `Label`s.
  override labels = () => {
    return Array.from(this.drawing.labelMap.values());
  };
  // Create and draw the Instance's `drawing`.
  draw = () => {
    // Remove the old drawing
    this.drawing.root.remove();

    // Draw our primary symbol and ports content
    const { primitive } = this.data;
    this.drawing = drawSymbolAndPorts(
      primitive.svgLines,
      primitive.ports.map((p) => p.loc),
      { loc: this.data.loc, orientation: this.data.orientation }
    );

    this.updateBbox();
    this.createLabels();

    if (this.highlighted) {
      this.highlight();
    }
  };

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
    this.drawing.labelMap.set(LabelKind.Name, nameLabel);

    // Create and add the instance-of Label
    const ofLabel = Label.create({
      text: this.data.of,
      kind: LabelKind.Of,
      loc: primitive.ofloc,
      parent: this,
    });
    this.drawing.labelGroup.add(ofLabel.drawing);
    this.drawing.labelMap.set(LabelKind.Of, ofLabel);
  };
  // Update the string-value from a `Label`.
  updateLabelText = (label: Label) => {
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

  readonly entityKind: EntityKind = EntityKind.SchPort;

  static create(data: schdata.Port): SchPort {
    const { portsymbol } = data;
    const drawing = drawSymbolAndPorts(
      portsymbol.svgLines,
      [point(0, 0)], // Include the implicit port at the origin
      { loc: data.loc, orientation: data.orientation }
    );
    const port = new SchPort(data, drawing);
    port.updateBbox();
    port.createLabels();
    return port;
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
    this.drawing.labelMap.set(LabelKind.Name, nameLabel);
  };

  // Get references to our child `Label`s.
  override labels = () => {
    return Array.from(this.drawing.labelMap.values());
  };
  // Create and draw the Instance's `drawing`.
  draw = () => {
    // Remove the old drawing
    this.drawing.root.remove();

    // Draw our primary symbol and ports content
    const { portsymbol } = this.data;
    this.drawing = drawSymbolAndPorts(
      portsymbol.svgLines,
      [point(0, 0)], // Include the implicit port at the origin
      { loc: this.data.loc, orientation: this.data.orientation }
    );

    this.updateBbox();
    this.createLabels();

    if (this.highlighted) {
      this.highlight();
    }
  };
  // Update the string-value from a `Label`.
  updateLabelText = (label: Label) => {
    if (label.kind === LabelKind.Name) {
      this.data.name = label.text;
    } else {
      console.log("Unknown label kind");
    }
  };
}

// A do-nothing callback function, used in a few places that insist on calling back.
function doNothing() {}
