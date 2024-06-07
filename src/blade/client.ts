import * as path from "path";
import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";

export const initClient = (context: vscode.ExtensionContext) => {
    // Set html indent
    const EMPTY_ELEMENTS: string[] = [
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "keygen",
        "link",
        "menuitem",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    ];

    vscode.languages.setLanguageConfiguration("blade", {
        indentationRules: {
            increaseIndentPattern:
                /<(?!\?|(?:area|base|br|col|frame|hr|html|img|input|link|meta|param)\b|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
            decreaseIndentPattern:
                /^\s*(<\/(?!html)[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
        },
        wordPattern:
            /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
        onEnterRules: [
            {
                beforeText: new RegExp(
                    `<(?!(?:${EMPTY_ELEMENTS.join(
                        "|",
                    )}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`,
                    "i",
                ),
                afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
                action: { indentAction: vscode.IndentAction.IndentOutdent },
            },
            {
                beforeText: new RegExp(
                    `<(?!(?:${EMPTY_ELEMENTS.join(
                        "|",
                    )}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`,
                    "i",
                ),
                action: { indentAction: vscode.IndentAction.Indent },
            },
        ],
    });

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(
        path.join("server", "out", "htmlServerMain.js"),
    );

    // If the extension is launch in debug mode the debug server options are use
    // Otherwise the run options are used
    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: { execArgv: ["--nolazy", "--inspect=6045"] },
        },
    };

    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        documentSelector: ["blade"],
        synchronize: {
            configurationSection: ["blade", "css", "javascript", "emmet"], // the settings to synchronize
        },
        initializationOptions: {
            embeddedLanguages: { css: true, javascript: true },
        },
    };

    // Create the language client and start the client.
    let client = new LanguageClient(
        "blade",
        "BLADE Language Server",
        serverOptions,
        clientOptions,
    );

    client.registerProposedFeatures();

    return client;
};
