import Two from "two.js";
import { Text } from "two.js/src/text";

// Local Imports
import { EntityInterface, EntityKind } from "./entity";
import { Point, point } from "./point";
import { labelStyle } from "./style";

export enum LabelKind {
  Name = "Name",
  Of = "Of",
}

export interface LabelData {
  text: string;
  loc: Point;
  kind: LabelKind;
  parent: any; // FIXME! Entity or some such thing.
}
export interface LabelDrawing {
  textElem: Text;
  bbox: any; // Two does not seem to type these. We could make our own.
}

// # Text Label
//
export class Label implements EntityInterface {
  entityKind: EntityKind = EntityKind.Label;

  data: LabelData;
  drawing: LabelDrawing;
  highlighted: boolean = false;
  failer: (msg: string) => void; // Function called on errors

  constructor(data: any, drawing: LabelDrawing, failer: any = console.log) {
    this.data = data;
    this.drawing = drawing;
    this.failer = failer;
  }

  // Create and return a new `Label`
  static create(data: LabelData): Label {
    const drawing = Label.createDrawing(data);
    return new Label(data, drawing);
  }
  // Create the drawn element and bounding box from label data
  static createDrawing(data: LabelData): LabelDrawing {
    const textElem = new Two.Text(data.text);
    textElem.translation.set(data.loc.x, data.loc.y);
    labelStyle(textElem);

    // Add it to our parent
    // Note this must be done *before* we compute the bounding box.
    data.parent.drawing.add(textElem);
    const bbox = textElem.getBoundingClientRect();

    // Create and return the `LabelDrawing` combination
    return { textElem, bbox };
  }

  // Update our text value
  update(text: string) {
    this.data.text = text;
    this.drawing.textElem.value = text;
    this.drawing.bbox = this.drawing.textElem.getBoundingClientRect();
    this.data.parent.updateLabel(this);
  }
  draw() {
    if (this.drawing) {
      // Remove any existing drawing from our parent
      this.data.parent.drawing.remove(this.drawing);
    }
    // And replace it with a new one
    this.drawing = Label.createDrawing(this.data);
  }
  // Boolean indication of whether `point` is inside the instance.
  hitTest(point: Point) {
    const bbox = this.drawing.bbox;
    return (
      point.x > bbox.left &&
      point.x < bbox.right &&
      point.y > bbox.top &&
      point.y < bbox.bottom
    );
  }
  // Update styling to indicate highlighted-ness
  highlight() {
    // FIXME: merge with styling
    // FIXME: keep `stroke` off for text
    // this.drawing.stroke = "red";
    this.drawing.textElem.fill = "red";
    this.highlighted = true;
  }
  // Update styling to indicate the lack of highlighted-ness
  unhighlight() {
    // FIXME: merge with styling
    // this.drawing.stroke = "black";
    this.drawing.textElem.fill = "black";
    this.highlighted = false;
  }
  // Abort an in-progress instance.
  abort() {}
  get kind(): LabelKind {
    return this.data.kind;
  }
  get text(): string {
    return this.data.text;
  }
  get bbox(): any {
    return this.drawing.bbox;
  }
}
