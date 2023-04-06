/*
 * # Hdl21 Schematics
 * # VsCode Extenstion Web View
 *
 * The code that runs inside VsCode's iframe-style webview panel.
 */

import "./index.css";
import { start } from "EditorCore";

// Get a VsCode API "instance".
// Note VSC includes many, many admonitions to not do this more than once per "session".
const vscode = acquireVsCodeApi();

// Create the VsCode `Platform` interface-implementer.
const vsCodePlatform = {
  // Send a message from the editor to its platform.
  sendMessage: (msg) /* Message */ => {
    vscode.postMessage(msg);
  },
  // Register a function to handle messages from the platform to the editor.
  registerMessageHandler: (handler) => {
    // Here we strip out the `data` field, which holds the `Message` itself,
    // from the VsCode `MessageEvent` provided by its `postMessage` API.
    const _handler = (event) => handler(event.data);
    window.addEventListener("message", _handler);
  },
};

// Create and start the `SchEditor`, with VsCode as its `platform`.
start(vsCodePlatform);
