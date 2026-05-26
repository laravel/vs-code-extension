import * as vscode from "vscode";

const functionRegex =
    /function\s+&?\s*(?<name>[A-Za-z_\x80-\xff][\w\x80-\xff]*)\s*\(/gm;

const findMatchingDelimiter = (
    text: string,
    openIndex: number,
    openChar: string,
    closeChar: string,
): number => {
    let depth = 0;

    for (let index = openIndex; index < text.length; index++) {
        const char = text[index];

        if (char === openChar) {
            depth++;
            continue;
        }

        if (char === closeChar) {
            depth--;

            if (depth === 0) {
                return index;
            }
        }
    }

    return -1;
};

const findMatchingParen = (text: string, openParenIndex: number): number =>
    findMatchingDelimiter(text, openParenIndex, "(", ")");

const skipWhitespaceAndComments = (text: string, index: number): number => {
    while (index < text.length) {
        if (/\s/.test(text[index])) {
            index++;
            continue;
        }

        if (text.slice(index, index + 2) === "//") {
            index += 2;

            while (index < text.length && text[index] !== "\n") {
                index++;
            }

            continue;
        }

        if (text[index] === "#") {
            index++;

            while (index < text.length && text[index] !== "\n") {
                index++;
            }

            continue;
        }

        if (text.slice(index, index + 2) === "/*") {
            const commentEnd = text.indexOf("*/", index + 2);

            return commentEnd === -1 ? text.length : commentEnd + 2;
        }

        break;
    }

    return index;
};

const hasReturnType = (text: string, closingParenIndex: number): boolean => {
    const index = skipWhitespaceAndComments(text, closingParenIndex + 1);

    return text[index] === ":";
};

type FunctionMatch = {
    name: string;
    nameIndex: number;
    closingParenIndex: number;
    bodyStartIndex: number;
    bodyEndIndex: number;
};

const getFunctionMatches = (text: string): FunctionMatch[] => {
    const matches: FunctionMatch[] = [];
    const ignoredFunctions = new Set(["__construct"]);

    for (const match of text.matchAll(functionRegex)) {
        const name = match.groups?.name;

        if (!name || ignoredFunctions.has(name.toLowerCase())) {
            continue;
        }

        const openParenIndex = match.index + match[0].length - 1;
        const closingParenIndex = findMatchingParen(text, openParenIndex);

        if (closingParenIndex === -1 || hasReturnType(text, closingParenIndex)) {
            continue;
        }

        const bodyStartIndex = text.indexOf("{", closingParenIndex);

        if (bodyStartIndex === -1) {
            continue;
        }

        const bodyEndIndex = findMatchingDelimiter(
            text,
            bodyStartIndex,
            "{",
            "}",
        );

        if (bodyEndIndex === -1) {
            continue;
        }

        matches.push({
            name,
            nameIndex: match.index + match[0].indexOf(name),
            closingParenIndex,
            bodyStartIndex,
            bodyEndIndex,
        });
    }

    return matches;
};

const inferReturnType = (functionBody: string): string => {
    const returnMatches = [...functionBody.matchAll(/return\s+([^;]+);/g)]
        .map((match) => match[1].trim())
        .filter(Boolean);

    if (returnMatches.length === 0 || functionBody.includes("return;")) {
        return "void";
    }

    const [firstReturn] = returnMatches;

    if (/^\[\s*[\s\S]*\]$/.test(firstReturn)) {
        return "array";
    }

    if (/^["'`]/.test(firstReturn)) {
        return "string";
    }

    if (/^-?\d+$/.test(firstReturn)) {
        return "int";
    }

    if (/^-?\d+\.\d+$/.test(firstReturn)) {
        return "float";
    }

    if (/^(true|false)$/.test(firstReturn)) {
        return "bool";
    }

    if (firstReturn === "null") {
        return "mixed";
    }

    if (firstReturn === "$this") {
        return "static";
    }

    const newClassMatch = firstReturn.match(/^new\s+([A-Za-z_\x80-\xff][\w\\\x80-\xff]*)/);

    if (newClassMatch?.[1]) {
        return newClassMatch[1].split("\\").pop() ?? "mixed";
    }

    const classMethodMatch = firstReturn.match(
        /^\\?([A-Za-z_\x80-\xff][\w\\\x80-\xff]*)::[A-Za-z_\x80-\xff][\w\x80-\xff]*\(/,
    );

    if (classMethodMatch?.[1]) {
        return classMethodMatch[1].split("\\").pop() ?? "mixed";
    }

    return "mixed";
};

export const diagnosticProvider = async (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    if (doc.languageId !== "php") {
        return [];
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = doc.getText();

    for (const match of getFunctionMatches(text)) {
        diagnostics.push({
            code: "returnType",
            message: `Function [${match.name}] is missing a return type.`,
            range: new vscode.Range(
                doc.positionAt(match.nameIndex),
                doc.positionAt(match.nameIndex + match.name.length),
            ),
            severity: vscode.DiagnosticSeverity.Warning,
            source: "Laravel Extension",
        });
    }

    return diagnostics;
};

export const codeActionProvider = async (
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
): Promise<vscode.CodeAction[]> => {
    if (diagnostic.code !== "returnType") {
        return [];
    }

    const text = document.getText();
    const match = getFunctionMatches(text).find((item) => {
        return (
            document.offsetAt(diagnostic.range.start) >= item.nameIndex &&
            document.offsetAt(diagnostic.range.start) <=
                item.nameIndex + item.name.length
        );
    });

    if (!match) {
        return [];
    }

    const functionBody = text.slice(match.bodyStartIndex + 1, match.bodyEndIndex);
    const inferredType = inferReturnType(functionBody);
    const suggestedTypes = Array.from(new Set([inferredType, "mixed"]));

    return suggestedTypes.map((type, index) => {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
            document.uri,
            document.positionAt(match.closingParenIndex + 1),
            `: ${type}`,
        );

        const action = new vscode.CodeAction(
            `Add return type ': ${type}'`,
            vscode.CodeActionKind.QuickFix,
        );

        action.edit = edit;
        action.diagnostics = [diagnostic];
        action.isPreferred = index === 0;

        return action;
    });
};
