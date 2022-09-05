/**
 * # Hdl21 Schematics 
 * ## Main Process
 * 
 * Primary OS interactions, including 
 * * Save file
 * * Load file
 * * Create the main editor window in the first place 
 * 
 */


const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');


// Schematic content from THE_ONLY_FILENAME_FOR_NOW
const THE_ONLY_FILENAME_FOR_NOW = "schematic.sch.svg";
const loadFile = () => {
  const content = fs.readFileSync(THE_ONLY_FILENAME_FOR_NOW, 'utf8');
  console.log(content);
  return content;
};
const saveFile = (_event, contents) => {
  fs.writeFile(THE_ONLY_FILENAME_FOR_NOW, contents, err => console.log(err));
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // Set up the handler for `save-file` messages.
  ipcMain.on('save-file', saveFile);
  ipcMain.on('renderer-up', (_event, msg) => {
    console.log("GOT RENDERED UP: " + msg);
    mainWindow.webContents.send('load-file', loadFile());
  });
  ipcMain.on('log-in-main', (_event, msg) => {
    console.log(msg);
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line global-require
if (require('electron-squirrel-startup')) {
  app.quit();
}
