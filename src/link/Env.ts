import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getEnv } from "../repositories/env";
import { findInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";
import { projectPath } from "../support/project";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findInDoc(doc, envMatchRegex, (match) => {
        const env = getEnv()[match[0]] ?? null;

        if (!env) {
            return null;
        }

        return vscode.Uri.file(projectPath(".env")).with({
            fragment: `L${env.lineNumber}`,
        });
    });
};

export default provider;
