import Two from "two.js";
import { Group } from "two.js/src/group";

// Local Imports
import { Point } from "./point";
import { PrimitiveMap } from "./primitive";
import { PortMap } from "./portsymbol";
import * as schdata from "./schematicdata";
import { Rotation } from "./orientation";
import { symbolStyle } from "./style";
import { Label, LabelKind } from "./label";
import { Entity, EntityKind, EntityInterface } from "./entity";
import { theCanvas } from "./canvas";

// Module-level state of the two.js canvas
const two = theCanvas.two;

// FIXME! fill these guys in
export class InstancePort {}

// Recursively traverse a node with a list of `children`,
// applying `fn` to each node.
const traverseAndApply = (node: any, fn: any): void => {
  fn(node);
  if (node.children) {
    for (let child of node.children) {
      traverseAndApply(child, fn);
    }
  }
};

// # Schematic Instance
//
// Combination of the Instance data and drawn visualization.
//
export class Instance implements EntityInterface {
  entityKind: EntityKind = EntityKind.Instance;

  data: schdata.Instance;
  nameLabel: Label | null = null;
  ofLabel: Label | null = null;

  // Number, unique ID. Not a constructor argument.
  entityId: number | null = null;
  // Drawing data, set during calls to `draw()`.
  drawing: Group | null = null;
  // The bounding box for hit testing.
  bbox: any = null; // FIXME! type
  highlighted: boolean = false; // bool
  constructor(data: schdata.Instance) {
    // Instance Data
    this.data = data; // schdata.Instance
  }
  highlight = () => {
    this.highlighted = true;
    if (!this.drawing) {
      return;
    }
    traverseAndApply(this.drawing, (node: any) => {
      // FIXME: merge with styling
      // FIXME: this needs to set `fill` for text elements
      // node.fill = "red";
      node.stroke = "red";
    });
  };
  unhighlight = () => {
    this.highlighted = false;
    if (!this.drawing) {
      return;
    }
    traverseAndApply(this.drawing, (node: any) => {
      // FIXME: merge with styling
      // FIXME: this needs to set `fill` for text elements
      // node.fill = "black";
      node.stroke = "black";
    });
  };
  // Get references to our child `Label`s.
  labels = () => {
    return [this.nameLabel, this.ofLabel];
  };
  // Create and draw the Instance's `drawing`.
  draw = () => {
    const primitive = PrimitiveMap.get(this.data.kind);
    if (!primitive) {
      console.log(`No primitive for kind ${this.data.kind}`);
      return;
    }
    if (this.drawing) {
      // Remove any existing drawing
      this.drawing.remove();
    }

    // Load the symbol as a Two.Group, wrapping the content in <svg> elements.
    let symbolSvgStr = "<svg>" + primitive.svgLines.join();
    for (let port of primitive.ports) {
      symbolSvgStr += `<circle cx="${port.loc.x}" cy="${port.loc.y}" r="4" class="hdl21-instance-port" />`;
    }
    symbolSvgStr += "</svg>";
    const symbol = two.load(symbolSvgStr, doNothing);
    traverseAndApply(symbol, symbolStyle);

    // Create the Instance's drawing-Group, including its symbol, names, and ports.
    this.drawing = new Two.Group();
    this.drawing.add(symbol);
    theCanvas.instanceLayer.add(this.drawing);

    // Apply our vertical flip if necessary, via a two-dimensional `scale`-ing.
    this.drawing.scale = 1;
    if (this.data.orientation.reflected) {
      this.drawing.scale = new Two.Vector(1, -1);
    }
    // Apply rotation. Note two.js applies rotation *clockwise*,
    // hence the negation of 90 and 270 degrees.
    const radianRotation = () => {
      switch (this.data.orientation.rotation) {
        case Rotation.R0:
          return 0;
        case Rotation.R90:
          return -Math.PI / 2;
        case Rotation.R180:
          return Math.PI;
        case Rotation.R270:
          return Math.PI / 2;
      }
    };
    this.drawing.rotation = radianRotation();
    this.drawing.translation.set(this.data.loc.x, this.data.loc.y);

    // Set the bounding box for hit testing.
    // Note this must come *after* the drawing is added to the scene.
    this.bbox = symbol.getBoundingClientRect();

    // Create and add the instance-name Label
    this.nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: primitive.nameloc,
      parent: this,
    });

    // Create and add the instance-of Label
    this.ofLabel = Label.create({
      text: this.data.of,
      kind: LabelKind.Of,
      loc: primitive.ofloc,
      parent: this,
    });

    if (this.highlighted) {
      this.highlight();
    }
  };
  // Boolean indication of whether `point` is inside the Instance's bounding box.
  hitTest = (point: Point) => {
    const bbox = this.bbox;
    return (
      point.x > bbox.left &&
      point.x < bbox.right &&
      point.y > bbox.top &&
      point.y < bbox.bottom
    );
  };
  // Abort drawing an in-progress instance.
  abort = () => {
    if (this.drawing) {
      // Remove any existing drawing
      this.drawing.remove();
      this.drawing = null;
    }
  };
  // Update the string-value from a `Label`.
  updateLabel = (label: Label) => {
    const kind = label.kind;
    if (kind === LabelKind.Name) {
      this.data.name = label.text;
    } else if (kind === LabelKind.Of) {
      this.data.of = label.text;
    } else {
      console.log("Unknown label kind");
    }
  };
}

// # Schematic Port
//
// An instance-like object with a drawing and location,
// which annotates a net as being externally accessible.
//
export class SchPort implements EntityInterface {
  entityKind: EntityKind = EntityKind.SchPort;

  data: schdata.Port;
  // Text port-name `Label`
  nameLabel: Label | null = null;
  // Number, unique ID. Not a constructor argument.
  entityId: number | null = null;
  // Drawing data, set during calls to `draw()`.
  drawing: Group | null = null;
  // The bounding box for hit testing.
  bbox: any = null; // FIXME! type
  highlighted: boolean = false; // bool
  constructor(data: schdata.Port) {
    this.data = data; // schdata.Port
  }
  highlight = () => {
    this.highlighted = true;
    if (!this.drawing) {
      return;
    }
    traverseAndApply(this.drawing, (node: any) => {
      // FIXME: merge with styling
      // FIXME: this needs to set `fill` for text elements
      // node.fill = "red";
      node.stroke = "red";
    });
  };
  unhighlight = () => {
    this.highlighted = false;
    if (!this.drawing) {
      return;
    }
    traverseAndApply(this.drawing, (node: any) => {
      // FIXME: merge with styling
      // FIXME: this needs to set `fill` for text elements
      // node.fill = "black";
      node.stroke = "black";
    });
  };
  // Get references to our child `Label`s.
  labels = () => {
    return [this.nameLabel];
  };
  // Create and draw the Instance's `drawing`.
  draw = () => {
    const portsymbol = PortMap.get(this.data.kind);
    if (!portsymbol) {
      console.log(`No portsymbol for kind ${this.data.kind}`);
      return;
    }
    if (this.drawing) {
      // Remove any existing drawing
      this.drawing.remove();
      //   theCanvas.instanceLayer.remove(this.drawing);
      this.drawing = null;
    }

    // Load the symbol as a Two.Group, wrapping the content in <svg> elements.
    let symbolSvgStr = "<svg>" + portsymbol.svgLines.join();
    symbolSvgStr += `<circle cx="0" cy="0" r="4" class="hdl21-instance-port" />`;
    symbolSvgStr += "</svg>";
    const symbol = two.load(symbolSvgStr, doNothing);
    traverseAndApply(symbol, symbolStyle);

    // Create the Instance's drawing-Group, including its symbol, names, and ports.
    this.drawing = new Two.Group();
    this.drawing.add(symbol);
    theCanvas.instanceLayer.add(this.drawing);

    // Apply our vertical flip if necessary, via a two-dimensional `scale`-ing.
    this.drawing.scale = 1;
    if (this.data.orientation.reflected) {
      this.drawing.scale = new Two.Vector(1, -1);
    }
    // Apply rotation. Note two.js applies rotation *clockwise*,
    // hence the negation of 90 and 270 degrees.
    const radianRotation = () => {
      switch (this.data.orientation.rotation) {
        case Rotation.R0:
          return 0;
        case Rotation.R90:
          return -Math.PI / 2;
        case Rotation.R180:
          return Math.PI;
        case Rotation.R270:
          return Math.PI / 2;
      }
    };
    this.drawing.rotation = radianRotation();
    this.drawing.translation.set(this.data.loc.x, this.data.loc.y);

    // Set the bounding box for hit testing.
    // Note this must come *after* the drawing is added to the scene.
    this.bbox = symbol.getBoundingClientRect();

    // Create and add the port-name Label
    this.nameLabel = Label.create({
      text: this.data.name,
      kind: LabelKind.Name,
      loc: portsymbol.nameloc,
      parent: this,
    });

    if (this.highlighted) {
      this.highlight();
    }
  };
  // Boolean indication of whether `point` is inside the Instance's bounding box.
  hitTest = (point: Point) => {
    if (!this.bbox) {
      return false;
    }
    const bbox = this.bbox;
    return (
      point.x > bbox.left &&
      point.x < bbox.right &&
      point.y > bbox.top &&
      point.y < bbox.bottom
    );
  };
  // Abort drawing an in-progress instance.
  abort = () => {
    if (this.drawing) {
      // Remove any existing drawing
      this.drawing.remove();
      this.drawing = null;
    }
  };
  // Update the string-value from a `Label`.
  updateLabel = (label: Label) => {
    if (label.kind === LabelKind.Name) {
      this.data.name = label.text;
    } else {
      console.log("Unknown label kind");
    }
  };
}

// A do-nothing callback function,
// used in a few places that insist on calling back.
function doNothing() {}
