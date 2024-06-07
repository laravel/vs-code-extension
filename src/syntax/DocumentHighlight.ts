import * as vscode from "vscode";
import * as html from "vscode-html-languageservice";
import * as lsTextDocument from "vscode-languageserver-textdocument";

const service = html.getLanguageService();

class DocumentHighlight implements vscode.DocumentHighlightProvider {
    provideDocumentHighlights(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
    ): vscode.DocumentHighlight[] | Thenable<vscode.DocumentHighlight[]> {
        const doc = lsTextDocument.TextDocument.create(
            document.uri.fsPath,
            "html",
            1,
            document.getText(),
        );

        return service.findDocumentHighlights(
            doc,
            position,
            service.parseHTMLDocument(doc),
        ) as any[];
    }
}

export default DocumentHighlight;
