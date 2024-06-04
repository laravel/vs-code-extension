"use strict";

import * as vscode from "vscode";
import { createFileWatcher } from "./../support/fileWatcher";
import { wordMatchRegex } from "./../support/patterns";
import { runInLaravel, template } from "./../support/php";
import { indent } from "./../support/util";

export default class Blade implements vscode.CompletionItemProvider {
    private customDirectives: any[] = [];

    constructor() {
        this.load();

        createFileWatcher(
            "app/{,*,**/*}CompletionProvider.php",
            this.load.bind(this),
        );
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        let isBlade =
            ["blade", "laravel-blade"].includes(document.languageId) ||
            document.fileName.endsWith(".blade.php");

        if (!isBlade) {
            return [];
        }

        return this.getDefaultDirectives(document, position).concat(
            this.customDirectives.map((directive) => {
                let completeItem = new vscode.CompletionItem(
                    `@${directive.name}${directive.hasParams ? "(...)" : ""}`,
                    vscode.CompletionItemKind.Keyword,
                );

                completeItem.insertText = new vscode.SnippetString(
                    `@${directive.name}${directive.hasParams ? "(${1})" : ""}`,
                );

                completeItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completeItem;
            }),
        );
    }

    load() {
        runInLaravel<any[]>(
            template("blade-directives"),
            "Custom Blade Directives",
        )
            .then((result) => {
                this.customDirectives = result;
            })
            .catch((exception) => {
                console.error(exception);
            });
    }

    getDefaultDirectives(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] {
        return Object.entries(this.defaultDirectives()).map(([key, value]) => {
            let completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Keyword,
            );

            completeItem.insertText = new vscode.SnippetString(
                typeof value === "string" ? value : value.join("\n"),
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            return completeItem;
        });
    }

    defaultDirectives(): { [key: string]: string | string[] } {
        return {
            "@if(...)": ["@if (${1})", indent("${2}"), "@endif"],
            "@error(...)": ["@error(${1})", indent("${2}"), "@enderror"],
            "@if(...) ... @else ... @endif": [
                "@if (${1})",
                indent("${2}"),
                "@else",
                indent("${3}"),
                "@endif",
            ],
            "@foreach(...)": [
                "@foreach (${1} as ${2})",
                indent("${3}"),
                "@endforeach",
            ],
            "@forelse(...)": [
                "@forelse (${1} as ${2})",
                indent("${3}"),
                "@empty",
                indent("${4}"),
                "@endforelse",
            ],
            "@for(...)": ["@for (${1})", indent("${2}"), "@endfor"],
            "@while(...)": ["@while (${1})", indent("${2}"), "@endwhile"],
            "@switch(...)": [
                "@switch(${1})",
                indent("@case(${2})"),
                indent("${3}", 2),
                indent("@break", 2),
                "",
                indent("@default"),
                indent("${4}", 2),
                "@endswitch",
            ],
            "@case(...)": ["@case(${1})", indent("${2}"), "@break"],
            "@break": "@break",
            "@continue": "@continue",
            "@break(...)": "@break(${1})",
            "@continue(...)": "@continue(${1})",
            "@default": "@default",
            "@extends(...)": "@extends(${1})",
            "@empty": "@empty",
            "@verbatim ...": ["@verbatim", indent("${1}"), "@endverbatim"],
            "@json(...)": "@json(${1})",
            "@elseif (...)": "@elseif (${1})",
            "@else": "@else",
            "@unless(...)": ["@unless (${1})", indent("${2}"), "@endunless"],
            "@isset(...)": ["@isset(${1})", indent("${2}"), "@endisset"],
            "@empty(...)": ["@empty(${1})", indent("${2}"), "@endempty"],
            "@auth": ["@auth", indent("${1}"), "@endauth"],
            "@guest": ["@guest", indent("${1}"), "@endguest"],
            "@auth(...)": ["@auth(${1})", indent("${2}"), "@endauth"],
            "@guest(...)": ["@guest(${1})", indent("${2}"), "@endguest"],
            "@can(...)": ["@can(${1})", indent("${2}"), "@endcan"],
            "@cannot(...)": ["@cannot(${1})", indent("${2}"), "@endcannot"],
            "@elsecan(...)": "@elsecan(${1})",
            "@elsecannot(...)": "@elsecannot(${1})",
            "@production": ["@production", indent("${1}"), "@endproduction"],
            "@env(...)": ["@env(${1})", indent("${2}"), "@endenv"],
            "@hasSection(...)": ["@hasSection(${1})", indent("${2}"), "@endif"],
            "@sectionMissing(...)": ["@sectionMissing(${1})", "${2}", "@endif"],
            "@include(...)": "@include(${1})",
            "@includeIf(...)": "@includeIf(${1})",
            "@includeWhen(...)": "@includeWhen(${1}, ${2})",
            "@includeUnless(...)": "@includeUnless(${1}, ${2})",
            "@includeFirst(...)": "@includeFirst(${1})",
            "@each(...)": "@each(${1}, ${2}, ${3})",
            "@once": ["@once", indent("${1}"), "@endonce"],
            "@yield(...)": "@yield(${1})",
            "@slot(...)": "@slot(${1})",
            "@stack(...)": "@stack(${1})",
            "@push(...)": ["@push(${1})", indent("${2}"), "@endpush"],
            "@prepend(...)": ["@prepend(${1})", indent("${2}"), "@endprepend"],
            "@php": ["@php", indent("${1}"), "@endphp"],
            "@component(...)": ["@component(${1})", "${2}", "@endcomponent"],
            "@section(...) ... @endsection": [
                "@section(${1})",
                "${2}",
                "@endsection",
            ],
            "@section(...)": "@section(${1})",
            "@props(...)": "@props(${1})",
            "@show": "@show",
            "@stop": "@stop",
            "@parent": "@parent",
            "@csrf": "@csrf",
            "@method(...)": "@method(${1})",
            "@inject(...)": "@inject(${1}, ${2})",
            "@dump(...)": "@dump(${1})",
            "@dd(...)": "@dd(${1})",
            "@lang(...)": "@lang(${1})",
            "@endif": "@endif",
            "@enderror": "@enderror",
            "@endforeach": "@endforeach",
            "@endforelse": "@endforelse",
            "@endfor": "@endfor",
            "@endwhile": "@endwhile",
            "@endswitch": "@endswitch",
            "@endverbatim": "@endverbatim",
            "@endunless": "@endunless",
            "@endisset": "@endisset",
            "@endempty": "@endempty",
            "@endauth": "@endauth",
            "@endguest": "@endguest",
            "@endproduction": "@endproduction",
            "@endenv": "@endenv",
            "@endonce": "@endonce",
            "@endpush": "@endpush",
            "@endprepend": "@endprepend",
            "@endphp": "@endphp",
            "@endcomponent": "@endcomponent",
            "@endsection": "@endsection",
            "@endslot": "@endslot",
            "@endcan": "@endcan",
            "@endcannot": "@endcannot",
        };
    }
}
