// # The Platform Interface
//
// The interface between the `SchematicEditor` and the underlying platforms it runs on.
//
interface Platform {
  // Send a message from the editor to its platform.
  sendMessage(msg: Message): void;
  // Register a function to handle messages from the platform to the editor.
  registerMessageHandler(handler: (msg: Message) => void): void;
}

/* 
 * # Message Types 
 */

type Change = {
  kind: "change";
};
type RendererUp = {
  kind: "renderer-up";
};
type Message = Change | RendererUp; // | ...

