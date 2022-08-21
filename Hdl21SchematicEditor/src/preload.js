/**
 * # Hdl21 Schematics 
 * ## Electron Preload Script
 * 
 * Sets up the IPC channels between main and renderer processes.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (contents) => ipcRenderer.send('save-file', contents)
})