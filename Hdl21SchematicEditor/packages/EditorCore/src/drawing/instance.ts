//
// # Instance (and Schematic-Port) Drawings
//

// NPM Imports
import { Circle } from "two.js/src/shapes/circle";
import { Text } from "two.js/src/text";
import { Group } from "two.js/src/group";
import { Vector } from "two.js/src/vector";

// Local Imports
import {
  schdata,
  Place,
  Placeable,
  Direction,
  Point,
  Orientation,
  Rotation,
  rotation,
  exhaust,
  Symbol,
} from "SchematicsCore";
import { Bbox, bbox } from "./bbox";
import { Label, LabelKind, LabelParent } from "./label";
import { EntityKind, EntityInterface } from "./entity";
import { symbolStyle, instacePortStyle } from "./style";
import { Canvas } from "./canvas";
import { theEditor } from "../editor";
import { MousePos } from "../mousepos";
import { Dot, DotParent } from "./dot";

// Shared Drawing Object, used by both `Instance` and `Port`
//
// Note *everything* in here is a two.js object - none of our own classes, which often have references to them.
// These `Drawing`s are replaced regularly on the same `Instance` and `Port` objects;
// they should not be used for identity operations refering to their parents.
//
class Drawing {
  constructor(
    public rootGroup: Group, // Root-level group, including all content
    public symbolGroup: Group, // Symbol group
    public portGroup: Group, // Group of instance ports
    public labelGroup: Group // Group of Label drawings
  ) {}
  canvas: Canvas = theEditor.canvas; // Reference to the drawing canvas. FIXME: the "the" part.

  // Create an empty Drawing
  static empty(): Drawing {
    return new Drawing(new Group(), new Group(), new Group(), new Group());
  }
  // Create a `Drawing` from data
  static create(data: DrawingData): Drawing {
    const { symbol, place } = data;

    // Create the Instance's drawing-Group, which includes its symbol, labels, and ports.
    const rootGroup = new Group();
    theEditor.canvas.instanceLayer.add(rootGroup);

    // Draw and add the symbol sub-group
    const symbolGroup = svgSymbolDrawing(symbol);
    rootGroup.add(symbolGroup);

    // Create a Group for the instance ports, draw and add each.
    const portGroup = new Group();
    rootGroup.add(portGroup);
    const portLocs = symbol.ports.map((p) => p.loc);
    for (let loc of portLocs) {
      portGroup.add(instancePortDrawing(loc));
    }

    // Add an initially empty label group to the root group.
    // Labels differ between users, and are added after the fact.
    const labelGroup = new Group();
    rootGroup.add(labelGroup);

    // Apply placement, rotation, and reflection.
    placeDrawingGroup(rootGroup, place);

    // Collect all these parts into a `Drawing`, and return it.
    return new Drawing(rootGroup, symbolGroup, portGroup, labelGroup);
  }
  highlight = () => {
    traverseAndApply(this.symbolGroup, (node: any) => {
      node.stroke = "red";
    });
    traverseAndApply(this.portGroup, (node: any) => {
      node.stroke = "red";
    });
  };
  unhighlight = () => {
    traverseAndApply(this.symbolGroup, (node: any) => {
      node.stroke = "black";
    });
    traverseAndApply(this.portGroup, (node: any) => {
      node.stroke = "black";
    });
  };
}

// Data required to create a `Drawing`,
// the base class of `Instance` and `Port`.
interface DrawingData {
  symbol: Symbol; // Symbol data
  place: Place; // Instance placement
}

// Base Class shared by `Instance` and `SchPort`
abstract class InstancePortBase implements LabelParent, DotParent, Placeable {
  constructor(
    public drawing: Drawing // Drawing data
  ) {}

  abstract data: schdata.Instance | schdata.Port; // Data from the schematic

  bbox: Bbox = bbox.empty(); // Bounding Box
  highlighted: boolean = false;
  dots: Set<Dot> = new Set();

  abstract createLabels(): void; // Create all Labels
  abstract drawingData(): DrawingData; // Get data for drawing
  abstract labels(): Array<Label>; // Get all Labels

  // Draw the Instance's `drawing`.
  draw = () => {
    // Remove the old drawing
    this.drawing.rootGroup.remove();

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
  // Draw each of our child `Label`s.
  drawLabels = () => {
    this.labels().map((label) => label.draw());
  };
  highlight = () => {
    this.drawing.highlight();
    for (let label of this.labels()) {
      label.highlight();
    }
    this.highlighted = true;
  };
  unhighlight = () => {
    this.drawing.unhighlight();
    for (let label of this.labels()) {
      label.unhighlight();
    }
    this.highlighted = false;
  };
  removeDrawing = () => {
    this.drawing.rootGroup.remove();
  };
  // Abort drawing an in-progress instance.
  abort = () => {
    this.drawing.rootGroup.remove();
  };
  // Boolean indication of whether `mousePos` is inside the Instance's bounding box.
  // The confusing part: despite calling "getBoundingClientRect", this uses the *canvas* coordinates(?).
  hitTest = (mousePos: MousePos) => bbox.hitTest(this.bbox, mousePos.canvas);
  // Update the Instance's bounding box.
  updateBbox = () => {
    // Set the bounding box for hit testing.
    // Note this must come *after* the drawing is added to the scene.
    // And note we use the *symbol* bounding box, not the overall drawing's,
    // which might include some long text labels.
    this.bbox = bbox.get(this.drawing.symbolGroup);
  };
  // The `LabelParent` interface
  abstract updateLabelText: (label: Label) => void;
  addLabelDrawing(textElem: Text): void {
    this.drawing.labelGroup.add(textElem);
  }
  get orientation(): Orientation {
    return this.data.orientation;
  }

  // The `Placeable` interface
  place = (): Place => {
    return structuredClone({
      loc: this.data.loc,
      orientation: this.data.orientation,
    });
  };
  move = (to: Place) => {
    console.log("FIXME! Placeable.move");
  };
  rotate = () => {
    this.data.orientation.rotation = rotation.next(
      this.data.orientation.rotation
    );
    this.draw();
  };
  flip = (dir: Direction) => {
    // Always flip vertically. Horizontal flips are comprised of a vertical flip and two rotations.
    this.data.orientation.reflected = !this.data.orientation.reflected;
    if (dir === Direction.Horiz) {
      this.data.orientation.rotation = rotation.next(
        rotation.next(this.data.orientation.rotation)
      );
    }
    this.draw();
  };

  removeDot(dot: Dot): void {
    this.dots.delete(dot);
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
  // Label(s)
  // Temporarily null during startup so we can give them a parent.
  nameLabel: Label | null = null;
  ofLabel: Label | null = null;

  static create(data: schdata.Instance): Instance {
    const instance = new Instance(data, Drawing.empty());
    instance.createLabels();
    instance.draw();
    return instance;
  }
  override drawingData(): DrawingData {
    const { data } = this;
    const { element, loc, orientation } = data;
    return {
      symbol: element.symbol,
      place: { loc, orientation },
    };
  }
  override createLabels = () => {
    const { element } = this.data;
    // Create and add the instance-name Label
    this.nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: element.nameloc,
      parent: this,
    });
    this.drawing.labelGroup.add(this.nameLabel.drawing);

    // Create and add the instance-of Label
    this.ofLabel = Label.create({
      text: this.data.of,
      kind: LabelKind.Of,
      loc: element.ofloc,
      parent: this,
    });
    this.drawing.labelGroup.add(this.ofLabel.drawing);
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
  // Get references to our child `Label`s.
  labels = (): Array<Label> => [this.nameLabel!, this.ofLabel!];
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
  // Label(s)
  // Temporarily null during startup so we can give them a parent.
  nameLabel: Label | null = null;

  static create(data: schdata.Port): SchPort {
    const port = new SchPort(data, Drawing.empty());
    port.createLabels();
    port.draw();
    return port;
  }
  override drawingData(): DrawingData {
    const { data } = this;
    const { portElement, loc, orientation } = data;
    return {
      symbol: {
        ...portElement.symbol,
        // Include the implicit port at the origin
        ports: [{ loc: Point.new(0, 0), name: "" }],
      },
      place: { loc, orientation },
    };
  }
  override createLabels = () => {
    const { portElement } = this.data;

    // Create and add the name Label
    this.nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: portElement.nameloc,
      parent: this,
    });
    this.drawing.labelGroup.add(this.nameLabel.drawing);
  };
  // Update the string-value from a `Label`.
  override updateLabelText = (label: Label) => {
    if (label.kind === LabelKind.Name) {
      this.data.name = label.text;
    } else {
      console.log("Unknown label kind");
    }
  };
  // Get references to our child `Label`s.
  labels = (): Array<Label> => [this.nameLabel!];
}

// FIXME! fill these guys in
export class InstancePort implements EntityInterface {
  entityKind: EntityKind.InstancePort = EntityKind.InstancePort;
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
  hitTest(mousePos: MousePos) {
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

// Load a `Symbol` as a two `Group`, wrapping the content in <svg> elements.
// This uses the SVG string representation of the symbol, coupled with two.js's SVG loading.
// Ultimately it can and should be replaced with direct calls to the graphics objects.
function svgSymbolDrawing(symbol: Symbol): Group {
  let symbolSvgStr = "<svg>" + symbol.svgLines.join() + "</svg>";
  const symbolGroup = theEditor.canvas.two.load(symbolSvgStr, doNothing);
  traverseAndApply(symbolGroup, symbolStyle);
  return symbolGroup;
}

// Draw an `InstancePort` as a `Circle`.
// Applies styling and returns the `Circle`.
function instancePortDrawing(loc: Point): Circle {
  return instacePortStyle(new Circle(loc.x, loc.y));
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

// A do-nothing callback function, used in a few places that insist on calling back.
function doNothing() {}
