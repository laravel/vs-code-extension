import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getEnv } from "../repositories/env";
import { findLinksInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";
import { projectPath } from "../support/project";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, envMatchRegex, (match) => {
        const env = getEnv().items[match[0]] ?? null;

        if (!env) {
            return null;
        }

        return vscode.Uri.file(projectPath(".env")).with({
            fragment: `L${env.lineNumber}`,
        });
    });
};

export default provider;
