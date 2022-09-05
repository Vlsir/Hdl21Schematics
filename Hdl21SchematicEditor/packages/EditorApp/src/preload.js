/**
 * # Hdl21 Schematics 
 * ## Electron Preload Script
 * 
 * Sets up the IPC channels between main and renderer processes.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    // Messages sent main => renderer
    handleLoadFile: (callback) => ipcRenderer.on('load-file', callback),
    handleLogInRenderer: (callback) => ipcRenderer.on('log-in-renderer', callback),
    
    // Messages sent renderer => main
    sendSaveFile: (contents) => ipcRenderer.send('save-file', contents),
    sendRendererUp: (contents) => ipcRenderer.send('renderer-up', contents),
    sendLogInMain: (contents) => ipcRenderer.send('log-in-main', contents),
});
