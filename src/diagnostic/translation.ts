import * as vscode from "vscode";
import { notFound } from ".";
import { getTranslations } from "../repositories/translations";
import { findWarningsInDoc } from "../support/doc";
import { translationBindingMatchRegex } from "../support/patterns";

const provider = (doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> => {
    return findWarningsInDoc(
        doc,
        translationBindingMatchRegex,
        (match, range) => {
            return getTranslations().whenLoaded((items) => {
                const item = items[match[0]];

                if (item) {
                    return null;
                }

                return notFound("Translation", match[0], range, "translation");
            });
        },
    );
};

export default provider;
