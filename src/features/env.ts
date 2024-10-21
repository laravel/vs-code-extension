import { notFound } from "@/diagnostic";
import { getEnv } from "@/repositories/env";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@/support/doc";
import { envMatchRegex } from "@/support/patterns";
import { projectPath } from "@/support/project";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const linkProvider: LinkProvider = (
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

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, envMatchRegex, (match) => {
        const item = getEnv().items[match];

        if (!item || item.value === "") {
            return null;
        }

        return new vscode.Hover(new vscode.MarkdownString(`\`${item.value}\``));
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, envMatchRegex, (match, range) => {
        return getEnv().whenLoaded((items) => {
            const env = items[match[0]];

            if (env) {
                return null;
            }

            return notFound("Env", match[0], range, "env");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
