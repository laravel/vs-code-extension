import { Diagnostic, DiagnosticSeverity, Range, Uri } from "vscode";

export const notFound = (
    descriptor: string,
    match: string,
    range: Range,
    code: DiagnosticCode | DiagnosticCodeObject,
): Diagnostic => ({
    message: `${descriptor} [${match}] not found.`,
    severity: DiagnosticSeverity.Warning,
    range,
    source: "Laravel Extension",
    code,
});

export type DiagnosticCodeObject = {
    value: DiagnosticCode;
    target: Uri;
};

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
    | "view"
    | "storage_disk";
