import * as vscode from "vscode";

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

interface SchematicEdit {
  readonly editId: string;
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
  public dispose(): any {
    // Does nothing.
    // If we eventually add any subscriptions or event listeners,
    // we'll need to dispose of them here.
    return;
  }

  protected _register<T extends vscode.Disposable>(value: T): T {
    // FIXME: delete
    return value;
  }

  static async create(
    uri: vscode.Uri,
    backupId: string | undefined
  ): Promise<SchematicDocument | PromiseLike<SchematicDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile =
      typeof backupId === "string" ? vscode.Uri.parse(backupId) : uri;
    const fileData = await SchematicDocument.readFile(dataFile);
    return new SchematicDocument(uri, fileData);
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === "untitled") {
      return new Uint8Array();
    }
    return new Uint8Array(await vscode.workspace.fs.readFile(uri));
  }

  readonly uri: vscode.Uri;
  documentData: Uint8Array;

  private _edits: Array<SchematicEdit> = [];
  private _savedEdits: Array<SchematicEdit> = [];

  private constructor(uri: vscode.Uri, initialContent: Uint8Array) {
    this.uri = uri;
    this.documentData = initialContent;
  }

  // public get uri() {
  //   return this._uri;
  // }

  private readonly _onDidDispose = this._register(
    new vscode.EventEmitter<void>()
  );
  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = this._register(
    new vscode.EventEmitter<{
      readonly content?: Uint8Array;
      readonly edits: readonly SchematicEdit[];
    }>()
  );
  /**
   * Fired to notify webviews that the document has changed.
   */
  public readonly onDidChangeContent = this._onDidChangeDocument.event;

  private readonly _onDidChange = this._register(
    new vscode.EventEmitter<{
      readonly label: string;
      undo(): void;
      redo(): void;
    }>()
  );
  /**
   * Fired to tell VS Code that an edit has occurred in the document.
   *
   * This updates the document's dirty indicator.
   */
  public readonly onDidChange = this._onDidChange.event;

  /**
   * Called when the user edits the document in a webview.
   *
   * This fires an event to notify VS Code that the document has been edited.
   */
  makeEdit(edit: SchematicEdit) {
    this._edits.push(edit);

    this._onDidChange.fire({
      label: "Stroke",
      undo: async () => {
        this._edits.pop();
        this._onDidChangeDocument.fire({
          edits: this._edits,
        });
      },
      redo: async () => {
        this._edits.push(edit);
        this._onDidChangeDocument.fire({
          edits: this._edits,
        });
      },
    });
  }

  // Save to our current location
  async save(cancellation: vscode.CancellationToken): Promise<void> {
    await this.saveAs(this.uri, cancellation);
    this._savedEdits = Array.from(this._edits);
  }

  // Save to a new location
  async saveAs(
    targetResource: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    if (cancellation.isCancellationRequested) {
      return;
    }
    await vscode.workspace.fs.writeFile(targetResource, this.documentData);
  }

  // Revert to the content on disk
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    const diskContent = await SchematicDocument.readFile(this.uri);
    this.documentData = diskContent;
    this._edits = this._savedEdits;
    this._onDidChangeDocument.fire({
      content: diskContent,
      edits: this._edits,
    });
  }

  // Back up to a temporary destination 
  async backup(
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    await this.saveAs(destination, cancellation);

    return {
      id: destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(destination);
        } catch {
          // noop
        }
      },
    };
  }
}

class ProviderInner {
  constructor(private readonly context: vscode.ExtensionContext) {}
  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  //#region CustomEditorProvider

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<SchematicDocument> {
    const document: SchematicDocument = await SchematicDocument.create(
      uri,
      openContext.backupId
    );

    const listeners: vscode.Disposable[] = [];

    listeners.push(
      document.onDidChange((e) => {
        // Tell VS Code that the document has been edited by the use.
        this._onDidChangeCustomDocument.fire({
          document,
          ...e,
        });
      })
    );

    listeners.push(
      document.onDidChangeContent((e) => {
        // Update all webviews when the document changes
        for (const webviewPanel of this.webviews.get(document.uri)) {
          this.postMessage(webviewPanel, "update", {
            edits: e.edits,
            content: e.content,
          });
        }
      })
    );

    // FIXME: remove
    document.onDidDispose(() => {});

    return document;
  }

  async resolveCustomEditor(
    document: SchematicDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage((e) =>
      this.onMessage(document, e)
    );

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage((e) => {
      if (e.type === "ready") {
        if (document.uri.scheme === "untitled") {
          this.postMessage(webviewPanel, "init", {
            untitled: true,
            editable: true,
          });
        } else {
          const editable = vscode.workspace.fs.isWritableFileSystem(
            document.uri.scheme
          );

          this.postMessage(webviewPanel, "init", {
            value: document.documentData,
            editable,
          });
        }
      }
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<SchematicDocument>
  >();
  public readonly onDidChangeCustomDocument =
    this._onDidChangeCustomDocument.event;

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

  // Get the initial HTML for `webview`.
  private getHtmlForWebview(webview: vscode.Webview): string {
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

  private _requestId = 1;
  private readonly _callbacks = new Map<number, (response: any) => void>();

  private postMessageWithResponse<R = unknown>(
    panel: vscode.WebviewPanel,
    type: string,
    body: any
  ): Promise<R> {
    const requestId = this._requestId++;
    const p = new Promise<R>((resolve) =>
      this._callbacks.set(requestId, resolve)
    );
    panel.webview.postMessage({ type, requestId, body });
    return p;
  }

  private postMessage(
    panel: vscode.WebviewPanel,
    type: string,
    body: any
  ): void {
    panel.webview.postMessage({ type, body }); // NOTE: this is a core VsCode API
  }

  private onMessage(document: SchematicDocument, message: any) {
    switch (message.type) {
      case "stroke":
        document.makeEdit(message as SchematicEdit);
        return;

      case "response": {
        const callback = this._callbacks.get(message.requestId);
        callback?.(message.body);
        return;
      }
    }
  }
}
export class SchematicEditorProvider
  implements vscode.CustomEditorProvider<SchematicDocument>
{
  inner: ProviderInner;
  constructor(private readonly context: vscode.ExtensionContext) {
    this.context = context;
    this.inner = new ProviderInner(context);
  }
  static newSchematicFileId = 1;
  //#region CustomEditorProvider

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<SchematicDocument> {
    return this.inner.openCustomDocument(uri, openContext, _token);
  }

  async resolveCustomEditor(
    document: SchematicDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    return this.inner.resolveCustomEditor(document, webviewPanel, _token);
  }

  // FIXME: what this does
  public readonly onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<SchematicDocument>
  >().event;

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
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {
  private readonly _webviews = new Set<{
    readonly resource: string;
    readonly webviewPanel: vscode.WebviewPanel;
  }>();

  /**
   * Get all known webviews for a given uri.
   */
  public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString();
    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel;
      }
    }
  }

  /**
   * Add a new webview to the collection.
   */
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = { resource: uri.toString(), webviewPanel };
    this._webviews.add(entry);

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry);
    });
  }
}

function register(context: vscode.ExtensionContext): vscode.Disposable {
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

  return vscode.window.registerCustomEditorProvider(
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
}

// # Activation
//
// Primary VsCode entry point for registering the extension.
//
export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor providers
  context.subscriptions.push(register(context));
}
