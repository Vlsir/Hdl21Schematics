/* 
 * # Hdl21 Schematics
 * # VsCode Extenstion Web View
 * 
 * The code that runs inside VsCode's iframe-style webview panel. 
 */

import { SchEditor } from "EditorCore";

// Get a VsCode API "instance". 
// Note VSC includes many, many admonitions to not do this more than once per "session". 
const vscode = acquireVsCodeApi();

// Create the VsCode `Platform` interface-implementer. 
const vsCodePlatform = {
    // Send a message from the editor to its platform.
    sendMessage: msg /* Message */ => {
        vscode.postMessage(msg);
    },
    // Register a function to handle messages from the platform to the editor.
    registerMessageHandler: handler => {
        window.addEventListener('message', handler);
    },
}

// Create the `SchEditor` variable, with VsCode as its `platform`.
const theEditor = new SchEditor(vsCodePlatform);

// FIXME: load a fresh new schematic, until we can pipe through getting them from file.  
theEditor.newSchematic();
