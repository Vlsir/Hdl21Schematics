//
// # Symbol
//

// Local Imports
import { Shape } from "./shape";
import { InstancePort } from "./element";

//
// # Symbol
//
export interface Symbol {
  shapes: Array<Shape>; // Drawing Shapes
  svgLines: Array<string>; // FIXME: merge these
  ports: Array<InstancePort>; // Located Ports
}

// The `Symbol` "implementation block".
export const Symbol = {
  // Create an empty `Symbol`.
  default(): Symbol {
    return {
      shapes: [],
      svgLines: [],
      ports: [],
    };
  },
};
