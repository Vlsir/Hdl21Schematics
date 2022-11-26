//
// # Hdl21 Schematic Editor
// ## Main Process
//
// Primary OS interactions, including
// * Save file
// * Load file
// * Create the main editor window in the first place
//

import {
  app,
  shell,
  dialog,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  WebContents,
} from "electron";
import * as fs from "fs";

// Workspace Imports
import { Message, MessageKind } from "PlatformInterface";
// Local Imports
import { Channels } from "./channels";

// FIXME: these are injected by the electron-forge webpack setup; preferably, get rid of em.
// declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
// declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
const isMac = process.platform === "darwin";

// Schematic content from THE_DEFAULT_SCHEMATIC_FILENAME
// FIXME: we retain the "default path at startup", for now
const THE_DEFAULT_SCHEMATIC_FILENAME = "schematic.sch.svg";

const saveFile = (path/*:string*/, contents/*:string*/) => {
  fs.writeFile(path, contents, (err) => console.log(err));
};

// Get the initial startup-time schematic file path.
// Equals the default file path, if it exists, or `null` if not.
function initialFilePath()/*: string | null */ {
  if (fs.existsSync(THE_DEFAULT_SCHEMATIC_FILENAME)) {
    return THE_DEFAULT_SCHEMATIC_FILENAME;
  }
  return null;
}

// # Electron Main
//
// The "thing" running the main Electron process.
// Primarily creates the webview/ renderer process,
// interacts with the underlying OS (file system, etc),
// and exchanges messages with the renderer process.
//
class ElectronMain {
  // // Our primary data attribute: the electron `BrowserWindow`.
  // // Most action (all) action happens through it.
  // mainWindow: BrowserWindow = new BrowserWindow({
  //   width: 1600,
  //   height: 800,
  //   webPreferences: {
  //     preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
  //   },
  // });

  // // FIXME: how this whole webcontents/ message-sending to multiple windows is actually supposed to work
  // sender: WebContents = this.mainWindow.webContents;

  // // File-system path to the currently-open schematic
  // // Null if no schematic is open, or a newly unsaved one is.
  // schFilePath: string | null = initialFilePath();

  // // The most recent schematic-SVG content, as an SVG-formatted string
  // schSvgContent: string | null = null;

  constructor() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 800,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });
    this.sender = this.mainWindow.webContents;
    this.schFilePath = initialFilePath();
    this.schSvgContent = null;
  }

  // Create a main window
  // Our static "constructor" plus "starter"
  static create()/*:ElectronMain*/ {
    if (theMain !== null) {
      return theMain;
    }
    const me = new ElectronMain();
    me.start();
    return me;
  }
  // Start up the main window.
  // Designed to (successfully) run exactly once.
  start = () => {
    // Register our callback for incoming messages from the renderer process.
    ipcMain.on(Channels.RendererToMain, this.handleMessage);

    // Set up our application menus
    const template = this.menuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Load index.html of the app.
    this.mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools.
    // FIXME: make this a dev-mode thing. But definitely don't turn it off until we know how.
    this.mainWindow.webContents.openDevTools();
  };

  // Send a message to the renderer, on our named channel.
  sendMessage = (msg /*: Message*/) => {
    return this.sender.send(Channels.MainToRenderer, msg);
  };

  // Handle incoming messages from the renderer process.
  handleMessage = (event/*:any*/, msg/*:Message*/) => {
    this.sender = event.sender;// as WebContents; // FIXME: type
    const { kind } = msg;
    switch (kind) {
      case MessageKind.RendererUp: {
        // Renderer/ webview has reported it's alive.
        // If we have a schematic file, send it some content.
        if (this.schFilePath) {
          this.loadFile();
          return this.sendMessage({
            kind: MessageKind.LoadFile,
            body: this.schSvgContent, // ! ,
          });
        }
        // And if not, leave it blank.
        return this.sendMessage({
          kind: MessageKind.NewSchematic,
        });
      }
      case MessageKind.SaveFile: {
        this.schSvgContent = msg.body;
        return this.handleFileSave();
      }
      case MessageKind.LogInMain: {
        return console.log(msg.body);
      }
      case MessageKind.Change:
      case MessageKind.LoadFile:
      case MessageKind.NewSchematic: {
        return; // FIXME(?)
      }
      default: {
        throw neverCheck(kind);
      }
    }
  };
  // Get our application menu "template".
  menuTemplate = () /*:Array<MenuItemConstructorOptions>*/ => {
    // The MacOS-native "app menu", next to the Apple at top-left, with "Services" and all that stuff.
    const macAppMenu /*:MenuItemConstructorOptions*/ = {
      type: "submenu",
      label: "Hdl21 Schematics", // FIXME: MacOS REALLY doesn't wanna show this name.
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    };

    // The primary array of cross-platform menus
    const menuItems /*:Array<MenuItemConstructorOptions>*/ = [
      // { role: 'fileMenu' }, // The default version
      {
        type: "submenu",
        label: "File",
        submenu: [
          {
            label: "Open",
            accelerator: "CmdOrCtrl+O",
            click: this.handleFileOpen,
          },
          {
            label: "Save",
            accelerator: "CmdOrCtrl+S",
            click: () =>
              console.log("FIXME: MAIN-PROCESS-SIDE FILE SAVING COMING SOON!"), // this.handleFileSave,
          },
          isMac ? { role: "close" } : { role: "quit" },
        ],
      },
      { role: "editMenu" }, // The default version
      // {
      //   label: 'Edit',
      //   submenu: [
      //     {
      //       role: 'undo', click: async () => {
      //         console.log("UNDO!!!");
      //       }
      //     },
      //     { role: 'redo' },
      //     { type: 'separator' },
      //     // { role: 'cut' },
      //     // { role: 'copy' },
      //     // { role: 'paste' },
      //   ]
      // },
      { role: "viewMenu" }, // The default version
      // {
      //   label: "View",
      //   submenu: [
      //     { role: "reload" },
      //     { role: "forceReload" },
      //     { role: "toggleDevTools" },
      //     { type: "separator" },
      //     { role: "resetZoom" },
      //     { role: "zoomIn" },
      //     { role: "zoomOut" },
      //     { type: "separator" },
      //     { role: "togglefullscreen" },
      //   ],
      // },
      { role: "windowMenu" }, // The default version
      // {
      //   label: "Window",
      //   submenu: [
      //     { role: "minimize" },
      //     { role: "zoom" },
      //     ...(isMac
      //       ? [
      //           { type: "separator" },
      //           { role: "front" },
      //           { type: "separator" },
      //           { role: "window" },
      //         ]
      //       : [{ role: "close" }]),
      //   ],
      // },
      {
        type: "submenu",
        role: "help",
        submenu: [
          {
            label: "Learn More",
            click: async () => {
              await shell.openExternal(
                "https://github.com/Vlsir/Hdl21Schematics"
              );
            },
          },
        ],
      },
    ];

    // Prepend the MacOS app menu, if we're on MacOS
    if (isMac) {
      return [macAppMenu, ...menuItems];
    } else {
      return menuItems;
    }
  };
  // Handle a file-save command
  // If no `schFilePath` is set, prompt the user for one via the OS-native dialog.
  handleFileSave = async () => {
    if (!this.schFilePath) {
      await this.getFilePathFromDialog();
    }
    if (this.schFilePath) {
      saveFile(this.schFilePath, this.schSvgContent);
    }
  };
  // Get a save-target path from a user dialog.
  getFilePathFromDialog = async () => {
    const result = await dialog.showSaveDialog(this.mainWindow, {
      title: "Save Schematic",
      defaultPath: "schematic.sch.svg",
    });
    if (result.canceled) {
      return;
    }
    // Success. Set our file-path.
    this.schFilePath = result.filePath;
  };
  // Handle a file-open command
  handleFileOpen = async () => {
    // construct the select file dialog
    const dialogReturnValue = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Schematic SVG Files", extensions: ["sch.svg"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (dialogReturnValue.canceled) {
      return;
    }
    if (dialogReturnValue.filePaths.length !== 1) {
      console.log("Open one schematic file at a time plz");
      return;
    }
    // Success. Set this as our active schematic.
    this.schFilePath = dialogReturnValue.filePaths[0];
    this.loadFile();
    this.sendMessage({
      kind: MessageKind.LoadFile,
      body: this.schSvgContent,
    });
  };
  loadFile = () => {
    this.schSvgContent = fs.readFileSync(this.schFilePath, "utf8");
  };
}

let theMain /*: ElectronMain | null*/ = null;

const createWindow = () => {
  theMain = ElectronMain.create();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// For now we have one (1) single window. Never more than one, and never zero.
// The "no zero" part in particular is not very MacOS-y;
// conventionally Mac apps "stay open" with no windows.
// Doing so will require a bit more sorting out the lifecycles of `BrowserWindow`s and their `WebContents` than we've done.
// So, for now, just quit on close.
app.on("window-all-closed", app.quit);

//
// # See the MacOS commentary on `window-all-closed` above.
//
// // Quit when all windows are closed, except on macOS. There, it's common
// // for applications and their menu bar to stay active until the user quits
// // explicitly with Cmd + Q.
// app.on("window-all-closed", () => {
//   if (!isMac) {
//     app.quit();
//   }
// });
// // On OS X it's common to re-create a window in the app when the
// // dock icon is clicked and there are no other windows open.
// app.on("activate", () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line global-require
if (require("electron-squirrel-startup")) {
  app.quit();
}

function neverCheck(_/*: never*/) /*: Error*/ {
  console.log("Never check failed - should be unreachable");
  // return new Error("unreachable");
}
