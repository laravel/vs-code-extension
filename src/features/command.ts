import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getCommands } from "@src/repositories/commands";
import { config } from "@src/support/config";
import { findHoverMatchesInDoc } from "@src/support/doc";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { projectPath } from "@src/support/project";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import {
    CompletionProvider,
    FeatureTag,
    HoverProvider,
    LinkProvider,
} from "..";

// Calls where the command name is unambiguously the first argument. Safe to flag
// as "not found" when unknown.
const strictTags = [
    {
        class: facade("Artisan"),
        method: ["call", "queue"],
        argumentIndex: 0,
    },
    {
        class: [
            ...facade("Schedule"),
            "Illuminate\\Console\\Scheduling\\Schedule",
        ],
        method: "command",
        argumentIndex: 0,
    },
];

const toFind: FeatureTag = [
    ...strictTags,
    // Scheduling on the `$schedule` variable (`app/Console/Kernel.php`): the receiver
    // type is often unresolved, so match the bare `->command(...)` call and rely on the
    // repository lookup to discard anything that is not a real command name. Kept out of
    // diagnostics to avoid false positives on unrelated `->command()` calls.
    {
        method: "command",
        argumentIndex: 0,
    },
];

// Arguments and options may be appended to the command name
// (e.g. `Schedule::command('queue:work --stop-when-empty')`).
const getName = (match: string) => {
    return match.split(" ").shift() ?? "";
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getCommands,
        ({ param, index }) => {
            if (index !== 0) {
                return null;
            }

            const command = getCommands().items.find(
                (command) => command.name === getName(param.value),
            );

            if (!command || !command.path || !command.line) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(projectPath(command.path)).with({
                    fragment: `L${command.line}`,
                }),
            );
        },
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
        getCommands,
        (match, { index }) => {
            if (index !== 0) {
                return null;
            }

            const command = getCommands().items.find(
                (command) => command.name === getName(match),
            );

            if (!command) {
                return null;
            }

            const text = [];

            if (command.description) {
                text.push(command.description);
            }

            if (command.path) {
                text.push(
                    `[${command.path}](${vscode.Uri.file(
                        projectPath(command.path),
                    ).with({
                        fragment: `L${command.line}`,
                    })})`,
                );
            }

            if (text.length === 0) {
                return null;
            }

            return new vscode.Hover(
                new vscode.MarkdownString(text.join("\n\n")),
            );
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        strictTags,
        getCommands,
        ({ param, index }) => {
            // Skip the empty string so no warning pops up while typing the name
            if (index !== 0 || param.value === "") {
                return null;
            }

            const command = getCommands().items.find(
                (command) => command.name === getName(param.value),
            );

            if (command) {
                return null;
            }

            return notFound(
                "Command",
                param.value,
                detectedRange(param),
                "command",
            );
        },
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
        if (!config("command.completion", true)) {
            return [];
        }

        if (!result.isParamIndex(0)) {
            return [];
        }

        return getCommands().items.map((command) => {
            let completionItem = new vscode.CompletionItem(
                command.name,
                vscode.CompletionItemKind.Value,
            );

            if (command.description) {
                completionItem.detail = command.description;
            }

            completionItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completionItem;
        });
    },
};
