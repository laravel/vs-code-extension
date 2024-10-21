import { notFound } from "@/diagnostic";
import { getConfigs } from "@/repositories/configs";
import {
    findHoverMatchesInDoc,
    findLinksInDoc,
    findWarningsInDoc,
} from "@/support/doc";
import { getTokens } from "@/support/parser";
import { configMatchRegex } from "@/support/patterns";
import { relativePath } from "@/support/project";
import * as fs from "fs";
import * as vscode from "vscode";
import { HoverProvider, LinkProvider } from "..";

const linkProvider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findLinksInDoc(doc, configMatchRegex, (match) => {
        const uri =
            getConfigs().items.find((item) => item.name === match[0])?.uri ??
            null;

        if (!uri) {
            return null;
        }

        // TODO: This should also be in hover
        const configKeyPath = match[0].split(".");

        const tokens = getTokens(fs.readFileSync(uri.fsPath, "utf8"))
            .filter((token) => typeof token !== "string")
            .filter((token) => token[0] === "T_CONSTANT_ENCAPSED_STRING");

        // We don't need the first key, it's the file name
        configKeyPath.shift();

        let lineNumber: number | null = null;

        for (const token of tokens) {
            if (
                [`'${configKeyPath[0]}'`, `"${configKeyPath[0]}"`].includes(
                    token[1],
                )
            ) {
                configKeyPath.shift();
            }

            if (configKeyPath.length === 0) {
                // @ts-ignore
                lineNumber = token[2];
                break;
            }
        }

        if (lineNumber === null) {
            return uri;
        }

        return uri.with({ fragment: `L${lineNumber}` });
    });
};

const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, configMatchRegex, (match) => {
        const item = getConfigs().items.find((config) => config.name === match);

        if (!item) {
            return null;
        }

        const text = [];

        if (item.value !== null) {
            text.push("`" + item.value + "`");
        }

        if (item.uri) {
            text.push(`[${relativePath(item.uri.path)}](${item.uri.fsPath})`);
        }

        if (text.length === 0) {
            return null;
        }

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, configMatchRegex, (match, range) => {
        return getConfigs().whenLoaded((items) => {
            const config = items.find((item) => item.name === match[0]);

            if (config) {
                return null;
            }

            return notFound("Config", match[0], range, "config");
        });
    });
};

export { diagnosticProvider, hoverProvider, linkProvider };
