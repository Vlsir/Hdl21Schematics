// # The Platform Interface
//
// The interface between the `SchematicEditor` and the underlying platforms it runs on.
//
export interface Platform {
  // Send a message from the editor to its platform.
  sendMessage: MessageHandler;
  // Register a function to handle messages from the platform to the editor.
  registerMessageHandler(handler: MessageHandler): void;
}

// Type alias for a function that takes a `Message` and returns nothing.
export type MessageHandler = (msg: Message) => void;

/*
 * # Message Types
 */

export enum MessageKind {
  RendererUp = "renderer-up",
  SaveFile = "save-file",
  LoadFile = "load-file",
  LogInMain = "log-in-main",
  Change = "change",
  NewSchematic = "new-schematic",
}

export type Change = {
  kind: MessageKind.Change;
};
export type RendererUp = {
  kind: MessageKind.RendererUp;
};
export type SaveFile = {
  kind: MessageKind.SaveFile;
  body: string;
};
export type NewSchematic = {
  kind: MessageKind.NewSchematic;
};
export type LogInMain = {
  kind: MessageKind.LogInMain;
};
export type LoadFile = {
  kind: MessageKind.LoadFile;
  body: string;
};

// The primary `Message` union type.
export type Message =
  | Change
  | RendererUp
  | SaveFile
  | LoadFile
  | NewSchematic
  | LogInMain;
