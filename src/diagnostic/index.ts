import { Diagnostic, DiagnosticSeverity, Range } from "vscode";

export const notFound = (
    descriptor: string,
    match: string,
    range: Range,
    code: DiagnosticCode,
): Diagnostic => ({
    message: `${descriptor} [${match}] not found.`,
    severity: DiagnosticSeverity.Warning,
    range,
    source: "Laravel Extension",
    code,
});

export type DiagnosticCode =
    | "appBinding"
    | "asset"
    | "auth"
    | "config"
    | "controllerAction"
    | "env"
    | "inertia"
    | "middleware"
    | "mix"
    | "route"
    | "translation"
    | "view";
