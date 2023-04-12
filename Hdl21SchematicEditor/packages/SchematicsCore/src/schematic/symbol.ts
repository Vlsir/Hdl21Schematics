//
// # Symbol
//

// Local Imports
import { GraphicsElement } from "./graphics";
import { InstancePort } from "./element";

//
// # Symbol
//
export interface Symbol {
  graphics: Array<GraphicsElement>; // Drawing Elements
  svgLines: Array<string>; // FIXME: merge these
  ports: Array<InstancePort>; // Located Ports
}

// The `Symbol` "implementation block".
export const Symbol = {
  // Create an empty `Symbol`.
  default(): Symbol {
    return {
      graphics: [],
      svgLines: [],
      ports: [],
    };
  },
};
