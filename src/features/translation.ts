import { openFile } from "@src/commands";
import { DiagnosticWithContext, notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import {
    getNestedTranslationItemByName,
    getTranslationItemByName,
    getTranslations,
    TranslationItem,
} from "@src/repositories/translations";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { getIndentNumber } from "@src/support/indent";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath, relativePath } from "@src/support/project";
import {
    contract,
    createIndexMapping,
    facade,
    generateNestedKeysStructure,
    indent,
} from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";
import os from "os";
import * as vscode from "vscode";
import {
    CodeActionProviderFunction,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

const toFind: FeatureTag = [
    {
        class: [contract("Translation\\Translator")],
        method: ["get", "choice"],
    },
    {
        class: facade("Lang"),
        method: ["has", "hasForLocale", "get", "choice"],
    },
    {
        method: ["__", "trans", "trans_choice", "@lang"],
    },
];

type ArgIndexMap = Record<string, Record<string, number>>;

const paramArgIndexes = createIndexMapping([
    [
        contract("Translation\\Translator"),
        {
            get: 1,
            choice: 2,
        },
    ],
    [
        "",
        {
            __: 1,
            trans: 1,
            "@lang": 1,
            trans_choice: 2,
        },
    ],
    [
        facade("Lang"),
        {
            get: 1,
            choice: 2,
        },
    ],
]);

const localeArgIndexes = createIndexMapping([
    [
        contract("Translation\\Translator"),
        {
            get: 2,
            choice: 3,
        },
    ],
    [
        "",
        {
            __: 2,
            trans: 2,
            "@lang": 2,
            trans_choice: 3,
        },
    ],
    [
        facade("Lang"),
        {
            has: 1,
            hasForLocale: 1,
            get: 2,
            choice: 3,
        },
    ],
]);

const getLang = (
    item: AutocompleteParsingResult.MethodCall,
): string | undefined => {
    const localeArgIndex = localeArgIndexes.get(
        item.className,
        item.methodName,
    );

    const locale = (
        item.arguments.children as AutocompleteParsingResult.Argument[]
    ).find((arg, i) => arg.name === "locale" || i === localeArgIndex);

    return locale?.children.length
        ? (locale.children as AutocompleteParsingResult.StringValue[])[0].value
        : undefined;
};

const getTranslationItemByLang = (
    translation: TranslationItem,
    lang?: string,
) => {
    return (
        translation[lang ?? getTranslations().items.default] ??
        translation[Object.keys(translation)[0]]
    );
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getTranslations,
        ({ param, index, item }) => {
            if (index !== 0) {
                return null;
            }

            const translation = getTranslationItemByName(param.value);

            if (!translation) {
                return null;
            }

            const def = getTranslationItemByLang(
                translation,
                getLang(item as AutocompleteParsingResult.MethodCall),
            );

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
        const item = getTranslationItemByName(match);

        if (!item) {
            return null;
        }

        const text = Object.entries(item)
            .filter(([key]) => key !== "default")
            .map(([key, translation]) => {
                return [
                    `\`${key}\`: ${translation.value}`,
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
        ({ param, index, item }) => {
            if (index !== 0) {
                return null;
            }

            const translation = getTranslationItemByName(param.value);

            if (translation) {
                return null;
            }

            return notFound(
                "Translation",
                param.value,
                detectedRange(param),
                "translation",
                item,
            );
        },
    );
};

export const codeActionProvider: CodeActionProviderFunction = async (
    diagnostic: DiagnosticWithContext,
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    token: vscode.CancellationToken,
): Promise<vscode.CodeAction[]> => {
    if (diagnostic.code !== "translation") {
        return [];
    }

    const missingVar = document.getText(diagnostic.range);

    if (!missingVar) {
        return [];
    }

    const actions = await Promise.all([
        addToPhpFile(diagnostic, missingVar),
        addToJsonFile(diagnostic, missingVar),
    ]);

    return actions.filter((action) => action !== null);
};

const addToJsonFile = async (
    diagnostic: DiagnosticWithContext,
    missingVar: string,
): Promise<vscode.CodeAction | null> => {
    const edit = new vscode.WorkspaceEdit();

    const translation = getTranslationItemByName(missingVar);

    if (translation) {
        return null;
    }

    const lang =
        getLang(diagnostic.context as AutocompleteParsingResult.MethodCall) ??
        getTranslations().items.default;

    const translationPath = getTranslations().items.paths.find(
        (path) => !path.startsWith("vendor/") && path.endsWith(`${lang}.json`),
    );

    if (!translationPath) {
        return null;
    }

    const path = projectPath(translationPath);

    const translationContents = await vscode.workspace.fs.readFile(
        vscode.Uri.file(projectPath(translationPath)),
    );

    const lines = translationContents.toString().split("\n");

    const lineNumber = lines.findIndex((line) => line.startsWith("}"));

    if (lineNumber === -1) {
        return null;
    }

    const finalValue = [indent(""), `"${missingVar}":`, '""'].join("") + os.EOL;

    edit.insert(
        vscode.Uri.file(path),
        new vscode.Position(lineNumber - 1, lines[lineNumber - 1].length),
        ",",
    );

    edit.insert(
        vscode.Uri.file(path),
        new vscode.Position(lineNumber, 0),
        finalValue,
    );

    const action = new vscode.CodeAction(
        "Add translation to the JSON file",
        vscode.CodeActionKind.QuickFix,
    );

    action.edit = edit;
    action.command = openFile(path, lineNumber, finalValue.length - 2);
    action.diagnostics = [diagnostic];

    return action;
};

const addToPhpFile = async (
    diagnostic: DiagnosticWithContext,
    missingVar: string,
): Promise<vscode.CodeAction | null> => {
    const edit = new vscode.WorkspaceEdit();

    const translation = getTranslationItemByName(missingVar);

    if (translation) {
        return null;
    }

    const nestedName = missingVar.split(".").slice(0, -1).join(".");

    // Case when user tries to add a key to a existing key that is not an array
    if (getTranslationItemByName(nestedName)) {
        return null;
    }

    const nestedTranslationItem = getNestedTranslationItemByName(missingVar);

    if (!nestedTranslationItem) {
        return null;
    }

    const nestedTranslationItemName = Object.keys(
        getTranslations().items.translations,
    ).find(
        (k) =>
            getTranslations().items.translations[k] === nestedTranslationItem,
    );

    if (!nestedTranslationItemName) {
        return null;
    }

    const lang =
        getLang(diagnostic.context as AutocompleteParsingResult.MethodCall) ??
        getTranslations().items.default;

    const path = nestedTranslationItem?.[lang]?.path;

    if (!path) {
        return null;
    }

    const line = nestedTranslationItem?.[lang]?.line;

    // We have to compare the missing var to the nested translation item name and find new keys
    // to add, for example: foo.bar.new-nested-key.new-key compares to foo.bar.baz.example gives
    // ["new-nested-key", "new-key"]
    const commonKeys = nestedTranslationItemName
        .split(".")
        .filter((v, i) => v === missingVar.split(".")[i]);

    const nestedKeys = missingVar
        .slice(commonKeys.join(".").length + 1)
        .split(".");

    const startIndentNumber = commonKeys.length;

    const translationContents = await vscode.workspace.fs.readFile(
        vscode.Uri.file(path),
    );

    const lineNumberFromTranslation =
        line && commonKeys.length > 1 ? line - 1 : undefined;

    const lineNumber =
        lineNumberFromTranslation ??
        translationContents
            .toString()
            .split("\n")
            .findIndex((line) => line.startsWith("];"));

    if (lineNumber === -1) {
        return null;
    }

    const nestedKeyStructure = generateNestedKeysStructure(
        nestedKeys,
        startIndentNumber,
    );

    const finalValue = nestedKeyStructure.join(os.EOL) + os.EOL;

    edit.insert(
        vscode.Uri.file(path),
        new vscode.Position(lineNumber, 0),
        finalValue,
    );

    const action = new vscode.CodeAction(
        "Add translation to the PHP file",
        vscode.CodeActionKind.QuickFix,
    );

    action.edit = edit;
    action.command = openFile(
        path,
        lineNumber + nestedKeys.length - 1,
        nestedKeyStructure[nestedKeys.length - 1].length - 2,
    );
    action.diagnostics = [diagnostic];

    return action;
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
        const localeArgIndex = localeArgIndexes.get(
            result.class(),
            result.func(),
        );
        const paramArgIndex = paramArgIndexes.get(
            result.class(),
            result.func(),
        );

        if (result.isParamIndex(paramArgIndex ?? -1)) {
            return this.getParameterCompletionItems(result, document, position);
        }

        if (
            result.isParamIndex(localeArgIndex ?? -1) ||
            result.isArgumentNamed("locale")
        ) {
            return getTranslations().items.languages.map((lang) => {
                let completionItem = new vscode.CompletionItem(
                    lang,
                    vscode.CompletionItemKind.Value,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
        }

        if (!result.isParamIndex(0)) {
            return [];
        }

        const totalTranslationItems = Object.entries(
            getTranslations().items.translations,
        ).length;

        const precedingCharacter = document.getText(
            new vscode.Range(
                position.line,
                position.character - 1,
                position.line,
                position.character,
            ),
        );

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

                if (precedingCharacter === "'") {
                    completionItem.insertText = key.replaceAll("'", "\\'");
                } else if (precedingCharacter === '"') {
                    completionItem.insertText = key.replaceAll('"', '\\"');
                }

                if (totalTranslationItems < 200) {
                    // This will bomb if we have too many translations,
                    // 200 is an arbitrary but probably safe number
                    completionItem.detail =
                        getTranslationItemByLang(translations).value;
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
                return getTranslationItemByLang(value)
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
