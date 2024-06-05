import * as fs from "fs";
import * as vscode from "vscode";
import { LinkProvider } from "..";
import { getConfigs } from "../repositories/configs";
import { findInDoc } from "../support/doc";
import { configMatchRegex } from "../support/patterns";
import { getTokens } from "../support/php";

const provider: LinkProvider = (
    doc: vscode.TextDocument,
): vscode.DocumentLink[] => {
    return findInDoc(doc, configMatchRegex, (match) => {
        const uri =
            getConfigs().find((item) => item.name === match[0])?.uri ?? null;

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

export default provider;
