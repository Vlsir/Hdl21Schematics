/*
 * # Hdl21 Schematics Renderer
 * 
 * Executes the graphical rendering for the editor app.
 */

import { SchEditor } from "./editor";

// The platform "abstraction". 
// Eventually this will be a module and layer over Electron, VsCode, and however the browser is implemented.
// For now its just a reference to the `window.electronAPI` object.
const THE_PLATFORM = window.electronAPI;

// Create the `SchEditor` variable, in module scope. 
const theEditor = new SchEditor(THE_PLATFORM);
