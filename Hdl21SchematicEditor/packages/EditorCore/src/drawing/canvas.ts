import Two from "two.js";
import { Group } from "two.js/src/group";
import { ZUI } from "two.js/extras/jsm/zui";
import { Vector } from "two.js/src/vector";

// Local Imports
import { Point, point } from "../point";
import { THE_SECRET_CANVAS_ID } from "../secret";

class Stage {
  // The root group, which contains all drawn content
  root: Group = new Group();

  // The "zui" pan & zoom thing.
  zui: ZUI = new ZUI(this.root);

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
class Canvas {
  // Our parent DOM element, set during `attach`.
  parentDomElement: HTMLElement | null = null;

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

  // Translate user-screen coordinates into our (maybe zoomed, maybe moved) canvas coordinates.
  screenToCanvas(screen: Point): Point {
    const canvas = this.zui.clientToSurface(screen.x, screen.y);
    return point(canvas.x, canvas.y);
  }
  // Translate canvas coordinates into the user/ screen space.
  canvasToScreen(canvas: Point): Point {
    const screen = this.zui.surfaceToClient(new Vector(canvas.x, canvas.y));
    return point(screen.x, screen.y);
  }
  // Attach the canvas to our DOM element.
  // This will fail if called before the DOM element is created.
  attach = () => {
    // The "!" here in particular is what will fail if the DOM element is not yet created.
    const e = document.getElementById(THE_SECRET_CANVAS_ID)!;
    this.parentDomElement = e;
    this.two.appendTo(e);
  };

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
  get zui() {
    return this.stage.zui;
  }
}

// Create "THE" one and only canvas object.
export const theCanvas = new Canvas();
