import Two from "two.js";
import { Group } from "two.js/src/group";
import { ZUI } from "two.js/extras/jsm/zui";
import { Vector } from "two.js/src/vector";

// Local Imports
import { Point } from "./point";

class Canvas {
  // The Two.js "draw-er", canvas, whatever they call it.
  two: Two = new Two({
    // Lotta futzing with these options has found these two to be indispensible.
    fullscreen: true,
    autostart: true,
    // Perhaps some day we can better understand what goes on with the others.
    // Particularly when implementing resizing.
    //
    // fitted: true,
    // width: window.innerWidth,
    // height: window.innerHeight,
    // width: 1600,
    // height: 800,
  }).appendTo(document.body);

  stage: Group = this.two.makeGroup();

  // The "zui" pan & zoom thing.
  zui: ZUI = new ZUI(this.stage);

  // The drawing layer groups. These are the basis for our "z-axis" drawing order & priority.
  gridLayer: Group = new Group();
  instanceLayer: Group = new Group();
  wireLayer: Group = new Group();
  labelLayer: Group = new Group();
  dotLayer: Group = new Group();

  constructor() {
    this.clear();
  }

  // Clear everything from the canvas, and recreate our groups and layers.
  clear() {
    // Clear the canvas.
    this.two.clear();

    // Create a new stage group and pan/ zoom element
    this.stage = this.two.makeGroup();
    this.zui = new ZUI(this.stage);
    this.zui.addLimits(0.5, 5);

    // Replace each layer
    this.gridLayer = new Group();
    this.instanceLayer = new Group();
    this.wireLayer = new Group();
    this.dotLayer = new Group();

    // The order of these call arguments right here sets the background to foreground ordering.
    this.stage.add(
      this.gridLayer,
      this.instanceLayer,
      this.wireLayer,
      this.dotLayer
    );
  }

  // Translate user-screen coordinates into our (maybe zoomed, maybe moved) canvas coordinates.
  screenToCanvas(screen: Point): Point {
    const canvas = this.zui.clientToSurface(screen.x, screen.y);
    return new Point(canvas.x, canvas.y);
  }
  // Translate canvas coordinates into the user/ screen space. 
  canvasToScreen(canvas: Point): Point {
    const screen = this.zui.surfaceToClient(new Vector(canvas.x, canvas.y));
    return new Point(screen.x, screen.y);
  }
}

export const theCanvas = new Canvas();
theCanvas.clear();
