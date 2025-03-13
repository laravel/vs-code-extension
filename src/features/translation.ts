import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import {
    getTranslations,
    NestedTranslationItem,
    TranslationItem,
} from "@src/repositories/translations";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { relativePath } from "@src/support/project";
import { contract, facade } from "@src/support/util";
import * as vscode from "vscode";
import { FeatureTag, HoverProvider, LinkProvider } from "..";

const toFind: FeatureTag = [
    {
        class: [contract("Translation\\Translator")],
        method: ["get", "choice"],
        argumentIndex: 0,        
    },    
    {
        class: facade("Lang"),
        method: ["has", "hasForLocale", "get", "getForLocale", "choice"],
        argumentIndex: [0, 1],
    },
    {
        method: ["__", "trans", "@lang"],
        argumentIndex: [0, 1],
    },
];

const getDefault = (translation: TranslationItem) => {
    const langDefault = getTranslations().items.default;

    return translation[langDefault] ?? translation[Object.keys(translation)[0]];
};

const getNestedTranslationItem = (match: string): NestedTranslationItem | undefined => {
    const translations = getTranslations().items.translations;

    const firstNestedMatch = Object.keys(translations).find(
        key => key.startsWith(match + '.')
    );

    return firstNestedMatch ? {
        translationItem: translations[firstNestedMatch],
        isNested: true
    } as NestedTranslationItem : undefined;
};

const getTranslationItem = (match: string): NestedTranslationItem | undefined => {
    const translations = getTranslations().items.translations;

    // First, try to find exact match
    const translationItem = translations[match];

    // If we can't find exact match, try to find a first nested element
    return translationItem ? {
        translationItem: translationItem,
        isNested: false
    } as NestedTranslationItem : getNestedTranslationItem(match);
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getTranslations,
        ({ param, index }) => {
            if (index !== 0) {
                return null;
            }

            const translationItem = getTranslationItem(param.value)?.translationItem;
    
            if (!translationItem) {
                return null;
            }

            const def = getDefault(translationItem);

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(def.path).with({
                    fragment: `L${def.line}`,
                }),
            );
        },
    );
};

export const hoverProvider: HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
): vscode.ProviderResult<vscode.Hover> => {
    return findHoverMatchesInDoc(doc, pos, toFind, getTranslations, (match) => {
        const translationItem = getTranslationItem(match);

        if (!translationItem?.translationItem) {
            return null;
        }

        const text = Object.entries(translationItem.translationItem)
            .filter(([key]) => key !== "default")
            .map(([key, translation]) => {
                return [
                    ...(!translationItem.isNested ? [
                        `\`${key}\`: ${translation.value}`
                    ] : []),
                    `[${relativePath(translation.path)}](${vscode.Uri.file(
                        translation.path,
                    ).with({
                        fragment: `L${translation.line}`,
                    })})`,
                ];
            })
            .flat();

        return new vscode.Hover(new vscode.MarkdownString(text.join("\n\n")));
    });
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getTranslations,
        ({ param, index }) => {
            if (index !== 0) {
                return null;
            }

            const translationItem = getTranslationItem(param.value)?.translationItem;

            if (translationItem) {
                return null;
            }

            return notFound(
                "Translation",
                param.value,
                detectedRange(param),
                "translation",
            );
        },
    );
};

export const completionProvider = {
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
        if (result.isParamIndex(1)) {
            return this.getParameterCompletionItems(result, document, position);
        }

        const totalTranslationItems = Object.entries(
            getTranslations().items.translations,
        ).length;

        return Object.entries(getTranslations().items.translations).map(
            ([key, translations]) => {
                let completionItem = new vscode.CompletionItem(
                    key,
                    vscode.CompletionItemKind.Value,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                if (totalTranslationItems < 200) {
                    // This will bomb if we have too many translations,
                    // 200 is an arbitrary but probably safe number
                    completionItem.detail = getDefault(translations).value;
                }

                return completionItem;
            },
        );
    },

    getParameterCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] {
        if (!config("translation.completion", true)) {
            return [];
        }

        if (!result.fillingInArrayKey()) {
            return [];
        }

        // Parameters autocomplete
        return Object.entries(getTranslations().items.translations)
            .filter(([key, value]) => key === result.param(0).value)
            .map(([key, value]) => {
                return getDefault(value)
                    .params.filter((param) => {
                        return true;
                        // TODO: Fix this....
                        // return !result.param.keys.includes(param);
                    })
                    .map((param) => {
                        let completionItem = new vscode.CompletionItem(
                            param,
                            vscode.CompletionItemKind.Variable,
                        );

                        completionItem.range = document.getWordRangeAtPosition(
                            position,
                            wordMatchRegex,
                        );

                        return completionItem;
                    });
            })
            .flat();
    },
};
