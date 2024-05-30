"use strict";

import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import { resolve } from "path";
import Logger from "./Logger";
import { runInLaravel } from "./PHP";

export default class Helpers {
    static wordMatchRegex = /[\w\d\-_\.\:\\\/@]+/g;
    static phpParser: any = null;
    static cachedParseFunction: any = null;
    static modelsCache: Array<string>;
    static modelsCacheTime: number = 0;
    static lastErrorMessage: number = 0;
    static disableErrorMessage: boolean = false;

    static tags: any = {
        config: { classes: ["Config"], functions: ["config"] },
        mix: { classes: [], functions: ["mix"] },
        route: { classes: ["Route"], functions: ["route", "signedRoute"] },
        trans: { classes: ["Lang"], functions: ["__", "trans", "@lang"] },
        validation: {
            classes: ["Validator"],
            functions: ["validate", "sometimes", "rules"],
        },
        view: {
            classes: ["View"],
            functions: [
                "view",
                "markdown",
                "links",
                "@extends",
                "@component",
                "@include",
                "@each",
            ],
        },
        env: { classes: [], functions: ["env"] },
        auth: {
            classes: ["Gate"],
            functions: ["can", "@can", "@cannot", "@canany"],
        },
        asset: { classes: [], functions: ["asset"] },
        model: { classes: [], functions: [] },
    };
    static functionRegex: any = null;

    static relationMethods = [
        "has",
        "orHas",
        "whereHas",
        "orWhereHas",
        "whereDoesntHave",
        "orWhereDoesntHave",
        "doesntHave",
        "orDoesntHave",
        "hasMorph",
        "orHasMorph",
        "doesntHaveMorph",
        "orDoesntHaveMorph",
        "whereHasMorph",
        "orWhereHasMorph",
        "whereDoesntHaveMorph",
        "orWhereDoesntHaveMorph",
        "withAggregate",
        "withCount",
        "withMax",
        "withMin",
        "withSum",
        "withAvg",
    ];

    /**
     * Create full path from project file name
     *
     * @param path
     * @param forCode
     * @param string
     */
    static projectPath(path: string, forCode: boolean = false): string {
        if (path[0] !== "/") {
            path = "/" + path;
        }

        let basePath = vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("basePath");
        if (forCode === false && basePath && basePath.length > 0) {
            if (
                basePath.startsWith(".") &&
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                basePath = resolve(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    basePath,
                );
            }
            basePath = basePath.replace(/[\/\\]$/, "");
            return basePath + path;
        }

        let basePathForCode = vscode.workspace
            .getConfiguration("Laravel")
            .get<string>("basePathForCode");
        if (forCode && basePathForCode && basePathForCode.length > 0) {
            if (
                basePathForCode.startsWith(".") &&
                vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders.length > 0
            ) {
                basePathForCode = resolve(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    basePathForCode,
                );
            }
            basePathForCode = basePathForCode.replace(/[\/\\]$/, "");
            return basePathForCode + path;
        }

        if (
            vscode.workspace.workspaceFolders instanceof Array &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            for (let workspaceFolder of vscode.workspace.workspaceFolders) {
                if (fs.existsSync(workspaceFolder.uri.fsPath + "/artisan")) {
                    return workspaceFolder.uri.fsPath + path;
                }
            }
        }
        return "";
    }

    static arrayUnique(value: any, index: any, self: Array<any>) {
        return self.indexOf(value) === index;
    }

    static showErrorPopup() {
        let disableErrorAlert = vscode.workspace
            .getConfiguration("Laravel")
            .get<boolean>("disableErrorAlert");
        if (
            disableErrorAlert == false &&
            Helpers.disableErrorMessage == false &&
            Helpers.lastErrorMessage + 10 < Date.now() / 1000
        ) {
            Helpers.lastErrorMessage = Date.now() / 1000;

            vscode.window
                .showErrorMessage(
                    "Laravel VS Code error",
                    "View Error",
                    "Don't show again",
                )
                .then(function (val: string | undefined) {
                    if (val === "Don't show again") {
                        Helpers.disableErrorMessage = true;
                    } else if (val === "View Error") {
                        Logger.channel?.show(true);
                    }
                });
        }
    }

    /**
     * Parse php code with 'php-parser' package.
     * @param code
     */
    static parsePhp(code: string): any {
        if (!Helpers.phpParser) {
            var PhpEngine = require("php-parser");
            Helpers.phpParser = new PhpEngine({
                parser: {
                    extractDoc: true,
                    php7: true,
                },
                ast: {
                    withPositions: true,
                },
            });
        }
        try {
            return Helpers.phpParser.parseCode(code);
        } catch (exception) {
            return null;
        }
    }

    /**
     * Convert php variable defination to javascript variable.
     * @param code
     */
    static evalPhp(code: string): any {
        var out = Helpers.parsePhp("<?php " + code + ";");
        if (out && typeof out.children[0] !== "undefined") {
            return out.children[0].expression.value;
        }
        return undefined;
    }

    /**
     * Parse php function call.
     *
     * @param text
     * @param position
     */
    static parseFunction(
        text: string,
        position: number,
        level: number = 0,
    ): any {
        var out: any = null;
        var classes = [];
        for (let i in Helpers.tags) {
            for (let j in Helpers.tags[i].classes) {
                classes.push(Helpers.tags[i].classes[j]);
            }
        }
        var regexPattern =
            "(((" +
            classes.join("|") +
            ")::)?([@A-Za-z0-9_]+))((\\()((?:[^)(]|\\((?:[^)(]|\\([^)(]*\\))*\\))*)(\\)|$))";
        var functionRegex = new RegExp(regexPattern, "g");
        var paramsRegex =
            /((\s*\,\s*)?)(\[[\s\S]*(\]|$)|array\[\s\S]*(\)|$)|(\"((\\\")|[^\"])*(\"|$))|(\'((\\\')|[^\'])*(\'|$)))/g;
        var inlineFunctionMatch =
            /\((([\s\S]*\,)?\s*function\s*\(.*\)\s*\{)([\S\s]*)\}/g;

        text = text.substr(Math.max(0, position - 200), 400);
        position -= Math.max(0, position - 200);

        var match = null;
        var match2 = null;
        if (
            Helpers.cachedParseFunction !== null &&
            Helpers.cachedParseFunction.text === text &&
            position === Helpers.cachedParseFunction.position
        ) {
            out = Helpers.cachedParseFunction.out;
        } else if (level < 6) {
            while ((match = functionRegex.exec(text)) !== null) {
                if (
                    position >= match.index &&
                    match[0] &&
                    position < match.index + match[0].length
                ) {
                    console.log(
                        "match",
                        match,
                        inlineFunctionMatch.exec(match[0]),
                    );
                    if (
                        (match2 = inlineFunctionMatch.exec(match[0])) !==
                            null &&
                        typeof match2[3] === "string" &&
                        typeof match[1] === "string" &&
                        typeof match[6] === "string" &&
                        typeof match2[1] === "string"
                    ) {
                        out = this.parseFunction(
                            match2[3],
                            position -
                                (match.index +
                                    match[1].length +
                                    match[6].length +
                                    match2[1].length),
                            level + 1,
                        );
                    } else if (
                        typeof match[1] === "string" &&
                        typeof match[6] === "string" &&
                        typeof match[7] === "string"
                    ) {
                        console.log("uh hi we are herereree", match[7].length);
                        var textParameters = [];
                        var paramIndex = null;
                        var paramIndexCounter = 0;
                        var paramsPosition =
                            position -
                            (match.index + match[1].length + match[6].length);

                        var functionInsideParameter;
                        if (
                            match[7].length >= 4 &&
                            (functionInsideParameter = this.parseFunction(
                                match[7],
                                paramsPosition,
                            ))
                        ) {
                            return functionInsideParameter;
                        }

                        console.log("params regex", paramsRegex.exec(match[7]));

                        while ((match2 = paramsRegex.exec(match[7])) !== null) {
                            textParameters.push(match2[3]);
                            if (
                                paramsPosition >= match2.index &&
                                typeof match2[0] === "string" &&
                                paramsPosition <=
                                    match2.index + match2[0].length
                            ) {
                                paramIndex = paramIndexCounter;
                            }
                            paramIndexCounter++;
                        }
                        var functionParametrs = [];
                        for (let i in textParameters) {
                            functionParametrs.push(
                                this.evalPhp(textParameters[i]),
                            );
                        }
                        out = {
                            class: match[3],
                            function: match[4],
                            paramIndex: paramIndex,
                            parameters: functionParametrs,
                            textParameters: textParameters,
                        };
                    }
                    if (level === 0) {
                        Helpers.cachedParseFunction = { text, position, out };
                    }
                }
            }
        }
        return out;
    }

    /**
     * Parse php function call from vscode editor.
     *
     * @param document
     * @param position
     */
    static parseDocumentFunction(
        document: vscode.TextDocument,
        position: vscode.Position,
    ) {
        var pos = document.offsetAt(position);
        return Helpers.parseFunction(document.getText(), pos);
    }

    /**
     * Get laravel models as array.
     *
     * @returns array<string>
     */
    static getModels(): Promise<Array<string>> {
        var self = this;
        return new Promise<Array<string>>(function (resolve, reject) {
            if (Math.floor(Date.now() / 1000) - self.modelsCacheTime < 60) {
                return resolve(self.modelsCache);
            } else {
                runInLaravel(
                    `
					echo json_encode(array_values(array_filter(array_map(function ($name) {return app()->getNamespace().str_replace([app_path().'/', app_path().'\\\\', '.php', '/'], ['', '', '', '\\\\'], $name);}, array_merge(glob(app_path('*')), glob(app_path('Models/*')))), function ($class) {
						return class_exists($class) && is_subclass_of($class, 'Illuminate\\\\Database\\\\Eloquent\\\\Model');
					})));
				`,
                    "Application Models",
                )
                    .then(function (result) {
                        var models = JSON.parse(result);
                        self.modelsCache = models;
                        resolve(models);
                    })
                    .catch(function (error) {
                        console.error(error);
                        resolve([]);
                    });
            }
        });
    }

    /**
     * Get indent space based on user configuration
     */
    static indent(text: string = "", repeat: number = 1): string {
        const editor = vscode.window.activeTextEditor;

        if (editor && editor.options.insertSpaces) {
            return " ".repeat(<number>editor.options.tabSize * repeat) + text;
        }

        return "\t" + text;
    }
}
