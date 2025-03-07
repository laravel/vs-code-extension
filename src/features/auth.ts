import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { AuthItem, getPolicies } from "@src/repositories/auth";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { contract, facade, relativeMarkdownLink } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
    ValidDetectParamTypes,
} from "..";

const toFind: FeatureTag = [
    {
        class: contract("Auth\\Access\\Gate"),
        method: [
            "has",
            "allows",
            "denies",
            "check",
            "any",
            "authorize",
            "inspect",            
        ],
        argumentIndex: 0,
    },
    {
        class: facade("Gate"),
        method: [
            "has",
            "allows",
            "denies",
            "check",
            "any",
            "none",
            "authorize",
            "inspect",
        ],
        argumentIndex: 0,
    },
    {
        class: [...facade("Route"), ...facade("Auth")],
        method: ["can", "cannot"],
        argumentIndex: 0,
    },
    {
        method: ["@can", "@cannot", "@canany"],
        argumentIndex: 0,
    },
];

const analyzeParam = (
    param:
        | AutocompleteParsingResult.StringValue
        | AutocompleteParsingResult.ArrayValue
        | string,
    item: AutocompleteParsingResult.ContextValue,
    index: number,
):
    | { missingReason: "not_found" | "wrong_model" | "ignored" }
    | {
          policies: AuthItem[];
          values: AutocompleteParsingResult.StringValue[] | { value: string }[];
          missingReason: null;
      } => {
    if (item.type !== "methodCall" || !item.methodName || index !== 0) {
        return {
            missingReason: "ignored",
        };
    }

    let values = [];

    if (typeof param === "string") {
        values.push({
            value: param,
        });
    } else if (param.type === "array") {
        values.push(
            ...param.children
                .map((child) => {
                    if (child.value.type === "string") {
                        return child.value;
                    }

                    return null;
                })
                .filter((v) => v !== null),
        );
    } else {
        values.push(param);
    }

    values = values.filter((value) => value.value !== "");

    if (values.length === 0) {
        return {
            missingReason: "not_found",
        };
    }

    const policies = values
        .map((value) => getPolicies().items[value.value])
        .flat();

    if (["has"].includes(item.methodName)) {
        return {
            policies,
            values,
            missingReason: null,
        };
    }

    if (item.arguments.children.length < 2) {
        // We don't have a second argument, just ignore it for now
        return {
            missingReason: "ignored",
        };
    }

    // @ts-ignore
    const nextArg = item.arguments.children[1].children[0];
    let classArg: string | null = null;

    if (nextArg?.type === "array") {
        classArg = nextArg.children[0]?.value?.className;
    } else {
        classArg = nextArg?.className;
    }

    if (!classArg) {
        // If it's not a class we can even identify, just ignore it
        return {
            missingReason: "ignored",
        };
    }

    const found = policies.find((items) => items.model === classArg);

    if (!found) {
        return {
            missingReason: "wrong_model",
        };
    }

    return {
        policies: [found],
        values,
        missingReason: null,
    };
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, ValidDetectParamTypes>(
        doc,
        toFind,
        getPolicies,
        ({ param, item, index }) => {
            const result = analyzeParam(param, item, index);

            if (result.missingReason) {
                return null;
            }

            if (result.policies.length > 1) {
                // We can't link to multiple policies, just ignore it
                return null;
            }

            return result.policies
                .map((item) => {
                    return result.values
                        .map(
                            (
                                param:
                                    | AutocompleteParsingResult.StringValue
                                    | { value: string },
                            ) => {
                                return new vscode.DocumentLink(
                                    detectedRange(
                                        param as AutocompleteParsingResult.StringValue,
                                    ),
                                    vscode.Uri.file(item.uri).with({
                                        fragment: `L${item.line}`,
                                    }),
                                );
                            },
                        )
                        .flat();
                })
                .flat();
        },
        ["array", "string"],
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(
        doc,
        pos,
        toFind,
        getPolicies,
        (match, { index, item }) => {
            const result = analyzeParam(match, item, index);

            if (result.missingReason) {
                return null;
            }

            const text = result.policies.map((item) => {
                if (item.policy) {
                    return [
                        "`" + item.policy + "`",
                        relativeMarkdownLink(
                            vscode.Uri.file(item.uri).with({
                                fragment: `L${item.line}`,
                            }),
                        ),
                    ].join("\n\n");
                }

                return relativeMarkdownLink(
                    vscode.Uri.file(item.uri).with({
                        fragment: `L${item.line}`,
                    }),
                );
            });

            return new vscode.Hover(
                new vscode.MarkdownString(text.join("\n\n")),
            );
        },
        ["array", "string"],
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getPolicies,
        ({ param, item, index }) => {
            const result = analyzeParam(param, item, index);

            if (result.missingReason === null || param.value === "") {
                return null;
            }

            if (result.missingReason === "not_found") {
                return notFound(
                    "Policy",
                    param.value,
                    detectedRange(param),
                    "auth",
                );
            }

            if (result.missingReason === "wrong_model") {
                return notFound(
                    "Policy/Model match",
                    param.value,
                    detectedRange(param),
                    "auth",
                );
            }

            return null;
        },
        ["array", "string"],
    );
};

export const completionProvider: CompletionProvider = {
    tags() {
        return toFind;
    },

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (!config("auth.completion", true)) {
            return [];
        }

        if (result.paramIndex() > 0) {
            return [];
        }

        return Object.entries(getPolicies().items).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Value,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            const policyClasses = value
                .map((item) => item.policy)
                .filter(String);

            if (policyClasses.length > 0) {
                completeItem.detail = policyClasses.join("\n\n");
            }

            return completeItem;
        });
    },
};
