import Two from "two.js";
import { Group } from "two.js/src/group";

// Local Imports
import { MousePos } from "../mousepos";
import { point } from "../point";
import { bbox, Bbox } from "./bbox";
import { THE_SECRET_CANVAS_ID } from "../secret";

class Stage {
  // The root group, which contains all drawn content
  root: Group = new Group();

  // The drawing layer groups. These are the basis for our "z-axis" drawing order & priority.
  gridLayer: Group = new Group();
  instanceLayer: Group = new Group();
  wireLayer: Group = new Group();
  labelLayer: Group = new Group();
  dotLayer: Group = new Group();

  // In the custom part of our constructor, set the hierarchical relationship between all these groups:
  // `root` contains all the others.
  constructor() {
    // The order of these call arguments right here sets the background to foreground ordering.
    this.root.add(
      this.gridLayer,
      this.instanceLayer,
      this.wireLayer,
      this.dotLayer
    );
  }
}
export class Canvas {
  // Our parent DOM element, set during `attach`.
  parentDomElement: HTMLElement | null = null;
  parentBbox: Bbox | null = null;

  // The Two.js "draw-er", canvas, whatever they call it.
  // Attached to `parentDomElement` during `attach`.
  two: Two = new Two({
    // Lotta futzing with these options has found these two to be indispensible.
    fullscreen: false,
    autostart: true,
    // Perhaps some day we can better understand what goes on with the others.
    // Particularly when implementing resizing.
    //
    // fitted: true,
    // width: window.innerWidth,
    // height: window.innerHeight,
    width: 1610,
    height: 810,
  });

  // The central `Stage` group, which contains all the other groups.
  stage: Stage = new Stage();

  // In the custom part of of construction, add the `Stage` to our `Two` instance.
  constructor() {
    this.two.add(this.stage.root);
  }
  // Clear everything from the canvas, and recreate our groups and layers.
  clear() {
    this.two.clear();
    this.stage = new Stage();
    this.two.add(this.stage.root);
  }
  // Attach the canvas to our DOM element.
  // This will fail if called before the DOM element is created.
  attach = () => {
    // The "!" here in particular is what will fail if the DOM element is not yet created.
    const e = document.getElementById(THE_SECRET_CANVAS_ID)!;
    this.two.appendTo(e);
    this.parentDomElement = e;
    this.parentBbox = bbox.get(e);
  };
  // Create a new mouse-position from a `MouseEvent`, or anything else with {clientX, clientY} properties.
  // Fails if the canvas is not attached to a DOM element.
  newMousePos(e: { clientX: number; clientY: number }): MousePos {
    const parentBbox = this.parentBbox!; // This here fails if the canvas is not attached to a DOM element.
    const client = point(e.clientX, e.clientY);
    const canvas = point(client.x - parentBbox.left, client.y - parentBbox.top);
    return { client, canvas };
  }

  // Forwarded properties from `stage`.
  get gridLayer() {
    return this.stage.gridLayer;
  }
  get instanceLayer() {
    return this.stage.instanceLayer;
  }
  get wireLayer() {
    return this.stage.wireLayer;
  }
  get dotLayer() {
    return this.stage.dotLayer;
  }
}

// Create "THE" one and only canvas object.
export const theCanvas = new Canvas();
