/*
 * # Hdl21 Schematics Renderer
 * 
 * Executes the graphical rendering for the editor app.
 */

import { SchEditor } from "EditorCore";

const { electronIPC } = window;

// Create the Electron `Platform` interface-implementer. 
const electronPlatform = {
    // Send a message from the editor to its platform.
    sendMessage: msg /* Message */ => {
        return electronIPC.sendMessage(msg);
    },
    // Register a function to handle messages from the platform to the editor.
    registerMessageHandler: handler => {
        // Note we drop the Electron `event` argument here and pass along the `msg` argument only.
        electronIPC.registerMessageHandler((_event, msg) => handler(msg));
    }
}
// Create the `SchEditor` variable, with Electron as its `platform`.
const theEditor = new SchEditor(electronPlatform);
