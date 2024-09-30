import * as vscode from "vscode";
import { notFound } from ".";
import { getPolicies } from "../repositories/auth";
import { findWarningsInDoc } from "../support/doc";
import { authMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, authMatchRegex, (match, range) => {
        return getPolicies().whenLoaded((items) => {
            if (items[match[0]]) {
                return null;
            }

            return notFound("Policy", match[0], range, "auth");
        });
    });
};

export default provider;
