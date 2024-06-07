import * as vscode from "vscode";
import { notFound } from ".";
import { getMixManifest } from "../repositories/mix";
import { findWarningsInDoc } from "../support/doc";
import { mixManifestMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(doc, mixManifestMatchRegex, (match, range) => {
        return getMixManifest().whenLoaded((items) => {
            const item = items.find((item) => item.key === match[0]);

            if (item) {
                return null;
            }

            return notFound("Mix manifest item", match[0], range);
        });
    });
};

export default provider;
