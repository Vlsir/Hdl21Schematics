// # The Platform Interface
//
// The interface between the `SchematicEditor` and the underlying platforms it runs on.
//
export interface Platform {
  // Send a message from the editor to its platform.
  sendMessage(msg: Message): void;
  // Register a function to handle messages from the platform to the editor.
  registerMessageHandler(handler: (msg: Message) => void): void;
}

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
export type LoadFile = {
  kind: MessageKind.LoadFile;
  body: string;
};
export type Message = Change | RendererUp | SaveFile | LoadFile | NewSchematic;
