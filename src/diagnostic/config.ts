import * as vscode from "vscode";
import { notFound } from ".";
import { getConfigs } from "../repositories/configs";
import { findWarningsInDoc } from "../support/doc";
import { configMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
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

export default provider;
