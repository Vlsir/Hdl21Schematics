/**
 * # Hdl21 Schematics
 * ## Electron Preload Script
 *
 * Sets up the IPC channels between main and renderer processes.
 */

const { contextBridge, ipcRenderer } = require("electron");

// Local Imports
const { Channels } = require("./channels");

// Create the `electronIPC` object, which shows up affixed to the renderer's `window` object,
// and its two methods for sending and receiving messages.
contextBridge.exposeInMainWorld("electronIPC", {
  // Messages sent main => renderer
  registerMessageHandler: (callback) =>
    ipcRenderer.on(Channels.MainToRenderer, callback),

  // Messages sent renderer => main
  sendMessage: (msg) => ipcRenderer.send(Channels.RendererToMain, msg),
});
