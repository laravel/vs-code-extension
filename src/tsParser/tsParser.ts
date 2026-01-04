import { TsParsingResult } from "@src/types";
import fs from "fs";
import path from "path";
import ts from "typescript";
import * as vscode from "vscode";
import { Cache } from "../support/cache";
import { getWorkspaceFolders } from "../support/project";
import { NodeParserFactory } from "./parsers";

const detected = new Cache<string, TsParsingResult.ContextValue[]>(50);
const files = new Map<string, { version: number }>();

class LanguageServiceFactory {
    public static createLanguageService(workspacePath: string) {
        const servicesHost: ts.LanguageServiceHost = {
            getScriptFileNames: () => Array.from(files.keys()),
            getScriptVersion: (fileName) =>
                files.get(fileName)?.version.toString() ?? "0",
            getScriptSnapshot: (fileName) => {
                if (!fs.existsSync(fileName)) {
                    return undefined;
                }

                return ts.ScriptSnapshot.fromString(
                    fs.readFileSync(fileName, "utf8"),
                );
            },
            getCurrentDirectory: () => workspacePath,
            getCompilationSettings: () => {
                const configPath = ts.findConfigFile(
                    workspacePath,
                    ts.sys.fileExists,
                    "tsconfig.json",
                );

                if (!configPath) {
                    return {};
                }

                const configFile = ts.readConfigFile(
                    configPath,
                    ts.sys.readFile,
                );

                const parsed = ts.parseJsonConfigFileContent(
                    configFile.config,
                    ts.sys,
                    path.dirname(configPath),
                );

                return parsed.options;
            },
            getDefaultLibFileName: ts.getDefaultLibFilePath,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            readDirectory: ts.sys.readDirectory,
        };

        return ts.createLanguageService(
            servicesHost,
            ts.createDocumentRegistry(),
        );
    }
}

export const languageService = LanguageServiceFactory.createLanguageService(
    getWorkspaceFolders()[0].uri.fsPath,
);

export const detect = (
    doc: vscode.TextDocument,
): TsParsingResult.ContextValue[] | undefined => {
    const code = doc.getText();

    if (detected.has(code)) {
        return detected.get(code) as TsParsingResult.ContextValue[];
    }

    files.set(doc.fileName, {
        version: (files.get(doc.fileName)?.version ?? 0) + 1,
    });

    const program = languageService.getProgram();

    if (!program) {
        return undefined;
    }

    const sourceFile = program.getSourceFile(doc.fileName);

    if (!sourceFile) {
        return undefined;
    }

    const nodeParserFactory = new NodeParserFactory(program.getTypeChecker());

    const contexts = nodeParserFactory.createContexts(sourceFile.getChildren());

    detected.set(code, contexts);

    return contexts;
};
