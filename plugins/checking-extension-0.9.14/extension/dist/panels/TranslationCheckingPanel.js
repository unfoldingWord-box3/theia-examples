"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationCheckingPanel = void 0;
const getUri_1 = require("../utilities/getUri");
const getNonce_1 = require("../utilities/getNonce");
/**
 * This class manages the state and behavior of TranslationNotes webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering TranslationNotes webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
class TranslationCheckingPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    /**
     * The TranslationNotesPanel class private constructor (called only from the render method).
     *
     * @param panel A reference to the webview panel
     * @param extensionUri The URI of the directory containing the extension
     */
    constructor(panel, extensionUri, messageEventHandlers) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
        // the panel or when the panel is closed programmatically)
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Set an event listener to listen for messages passed from the webview context
        this._setWebviewMessageListener(this._panel.webview, messageEventHandlers);
    }
    /**
     * Initializes or updates the HTML content of the webview.
     * This is called from within a custom text editor.
     */
    initializeWebviewContent() {
        const webview = this._panel.webview;
        webview.html = this._getWebviewContent(webview, this._extensionUri);
    }
    /**
     * Cleans up and disposes of webview resources when the webview panel is closed.
     */
    dispose() {
        TranslationCheckingPanel.currentPanel = undefined;
        // Dispose of the current webview panel
        this._panel.dispose();
        // Dispose of all disposables (i.e. commands) for the current webview panel
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    /**
     * Defines and returns the HTML that should be rendered within the webview panel.
     *
     * @remarks This is also the place where references to the React webview build files
     * are created and inserted into the webview HTML.
     *
     * @param webview A reference to the extension webview
     * @param extensionUri The URI of the directory containing the extension
     * @returns A template string literal containing the HTML that should be
     * rendered within the webview panel
     */
    _getWebviewContent(webview, extensionUri) {
        const scriptUri = (0, getUri_1.getUri)(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
        const stylesUri = (0, getUri_1.getUri)(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
        const codiconFontUri = (0, getUri_1.getUri)(webview, extensionUri, [
            "node_modules",
            "@vscode/codicons",
            "dist",
            "codicon.css",
        ]);
        const nonce = (0, getNonce_1.getNonce)();
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src https://*.vscode-resource.vscode-cdn.net ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; connect-src 'self' https:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Translation Notes</title>
          <link href="${codiconFontUri}" rel="stylesheet" />
        </head>
        <body style="overflow-y: auto;">
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    }
    /**
     * Sets up an event listener to listen for messages passed from the webview context and
     * executes code based on the message that is recieved.
     *
     * @param webview A reference to the extension webview
     * @param context A reference to the extension context
     */
    _setWebviewMessageListener(webview, messageEventHandlers) {
        webview.onDidReceiveMessage(messageEventHandlers, undefined, this._disposables);
    }
}
exports.TranslationCheckingPanel = TranslationCheckingPanel;
//# sourceMappingURL=TranslationCheckingPanel.js.map