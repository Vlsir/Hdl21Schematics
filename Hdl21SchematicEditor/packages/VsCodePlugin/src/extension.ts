import * as vscode from "vscode";
import { TextDecoder } from "util";

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Read text content from the file at `uri`.
async function readFile(uri: vscode.Uri): Promise<string> {
  if (uri.scheme === "untitled") {
    return ""; // New file, no content.
  }
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder("utf-8").decode(bytes);
}

// # Schematic Document Model
//
// Implementer of VsCode's `CustomDocument` interface,
// which really just consists of its `uri` and `dispose` method.
//
// Much of the work which the VsCode API requests via calls to `SchematicEditorProvider`
// is offloaded to each individual `SchematicDocument` instance.
//
class SchematicDocument implements vscode.CustomDocument {
  // The `CustomDocument` Interface
  readonly uri: vscode.Uri;
  public dispose(): any {
    // Does nothing.
    // If we eventually add any subscriptions or event listeners,
    // we'll need to dispose of them here.
  }

  static async create(
    uri: vscode.Uri,
    backupId: string | undefined,
    provider: SchematicEditorProvider
  ): Promise<SchematicDocument | PromiseLike<SchematicDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile =
      typeof backupId === "string" ? vscode.Uri.parse(backupId) : uri;
    const fileData = await readFile(dataFile);
    return new SchematicDocument(uri, fileData, provider);
  }

  // SVG string value of the document
  documentData: string;
  // Reference to the provider
  provider: SchematicEditorProvider;
  // Reference to our webview panel.
  // Set to `null` at creation time, and then set during `resolveCustomEditor`.
  webviewPanel: vscode.WebviewPanel | null;

  private constructor(
    uri: vscode.Uri,
    initialContent: string,
    provider: SchematicEditorProvider
  ) {
    this.uri = uri;
    this.documentData = initialContent;
    this.provider = provider;
    this.webviewPanel = null;
  }

  // Save to our current location
  async save(cancellation: vscode.CancellationToken): Promise<void> {
    await this.saveAs(this.uri, cancellation);
  }

  // Save to a new location. *Does not* update our URI field.
  async saveAs(
    targetResource: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    console.log("SAVE AS");
    if (cancellation.isCancellationRequested) {
      return;
    }
    const bytes = Buffer.from(this.documentData, "utf8");
    await vscode.workspace.fs.writeFile(targetResource, bytes);
  }

  // Revert to the content on disk
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    // Reload the data from disk
    this.documentData = await readFile(this.uri);
    // Send it to the webview for rendering
    this.sendMessage({ kind: "load-file", body: this.documentData });
    // Notify the VsCode API that we've reverted
    // FIXME: does it want us to do this? Their example does.
    this.notifyChange();
  }

  // Back up to a temporary destination
  async backup(
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    // Save to the destination
    await this.saveAs(destination, cancellation);

    // And give VsCode a function to delete it
    const deleter = async () => {
      try {
        await vscode.workspace.fs.delete(destination);
      } catch {
        /* noop */
      }
    };
    return {
      id: destination.toString(),
      delete: deleter,
    };
  }

  // Send a message to the webiew
  private sendMessage(msg: any) {
    if (!this.webviewPanel) {
      console.log("ERROR: sendMessage called with no webviewPanel");
      return;
    }
    return this.webviewPanel.webview.postMessage(msg);
  }
  undo() {
    console.log("GOT AN UNDO!"); // FIXME!
  }
  redo() {
    console.log("GOT AN UNDO!"); // FIXME!
  }
  // Notify VsCode of a change to the document
  notifyChange() {
    return this.provider.changer.fire({
      document: this,
      undo: this.undo.bind(this),
      redo: this.redo.bind(this),
    });
  }

  // Handle incoming messages from the webview process.
  async handleMessage(msg: any) {
    switch (msg.kind) {
      case "renderer-up": {
        // Editor has reported it's alive, send it some schematic content
        const content = await readFile(this.uri);
        return this.sendMessage({
          kind: "load-file",
          body: content,
        });
      }
      case "change": {
        console.log("GOT CHANGE MESSAGE");
        console.log(msg);
        return this.notifyChange();
      }
      case "save-file": {
        // FIXME: this should really be renamed to "update contents"; the save-request comes from the VsCode side.
        this.documentData = msg.body;
        // return this.save(msg.body);
        return;
      }
      case "log-in-main":
        return console.log(msg.body);
      default: {
        console.log("UNKNOWN MESSAGE KIND: ");
        console.log(msg);
      }
    }
  }
}

//
// # Schematic Editor Provider
//
// Implements the `CustomEditorProvider` interface, which is the main entry point
// for most of the VsCode API.
// Manages all `SchematicDocument` instances, forwarding many of the VsCode API
// calls to the appropriate `SchematicDocument` instance.
//
export class SchematicEditorProvider
  implements vscode.CustomEditorProvider<SchematicDocument>
{
  constructor(private readonly context: vscode.ExtensionContext) {
    this.context = context;
  }
  // Global counter of files, largely for new-file naming
  static newSchematicFileId = 1;

  /*
   * # The `CustomEditorProvider` Interface
   */
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<SchematicDocument> {
    const document: SchematicDocument = await SchematicDocument.create(
      uri,
      openContext.backupId,
      this
    );
    return document;
  }

  // "Resolve" the combination of a document and a webview.
  async resolveCustomEditor(
    document: SchematicDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Give the document a reference to its webview panel
    document.webviewPanel = webviewPanel;

    // Setup initial content for the webview
    const { webview } = webviewPanel;
    webview.options = { enableScripts: true };
    webview.html = this.initialHtml(webview);

    // And register the document handler for incoming messages from the webview
    webview.onDidReceiveMessage(document.handleMessage.bind(document));

    // FIXME: roll in this editable vs read-only stuff
    // const editable = vscode.workspace.fs.isWritableFileSystem(
    //   document.uri.scheme
    // );
  }

  // The change-notification event system.
  // Each `SchematicDocument` has a reference to us, and fires this event it when it changes.
  public changer = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<SchematicDocument>
  >();
  // This `event` field is the part the `CustomEditorProvider` interface requires.
  public readonly onDidChangeCustomDocument = this.changer.event;

  public saveCustomDocument(
    document: SchematicDocument,
    cancellation: vscode.CancellationToken
  ): Thenable<void> {
    return document.save(cancellation);
  }

  public saveCustomDocumentAs(
    document: SchematicDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }

  public revertCustomDocument(
    document: SchematicDocument,
    cancellation: vscode.CancellationToken
  ): Thenable<void> {
    return document.revert(cancellation);
  }

  public backupCustomDocument(
    document: SchematicDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken
  ): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }
  /*
   * # End the `CustomEditorProvider` Interface
   */

  // Get the initial HTML for `webview`.
  private initialHtml(webview: vscode.Webview): string {
    // Get the script-path, through VsCode's required URI methods
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview.js")
    );
    // Set the CSP to only allow scripts with a specific nonce, generated in this function.
    const nonce = getNonce();

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <!-- Note VsCode does seem to care that this script is part of body and not head. -->
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

// # Activation
//
// Primary VsCode entry point for registering the extension.
//
export function activate(context: vscode.ExtensionContext) {
  const viewType = "hdl21.schematics";

  vscode.commands.registerCommand("hdl21.schematics.new", () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("Requires opening a workspace");
      return;
    }

    const uri = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      `schematic${SchematicEditorProvider.newSchematicFileId++}.sch.svg`
    ).with({ scheme: "untitled" });

    vscode.commands.executeCommand("vscode.openWith", uri, viewType);
  });

  const registration = vscode.window.registerCustomEditorProvider(
    viewType,
    new SchematicEditorProvider(context),
    {
      // `retainContextWhenHidden` keeps the webview alive even when it is not visible.
      // VsCode offers many admonitions *not* to use this, if we can ever get away from it.
      webviewOptions: { retainContextWhenHidden: true },
      // We *do not* support multiple webviews per document.
      // Doing so would change quite a bit of how the editor works,
      // e.g. to update the graphical display of one while the other is edited.
      supportsMultipleEditorsPerDocument: false,
    }
  );
  // Finally, register it with the VsCode `context`.
  context.subscriptions.push(registration);
}
