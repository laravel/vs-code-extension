import * as vscode from "vscode";
import { notFound } from ".";
import { getEnv } from "../repositories/env";
import { findWarningsInDoc } from "../support/doc";
import { envMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
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

export default provider;
