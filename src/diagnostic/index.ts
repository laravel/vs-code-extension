import { Diagnostic, DiagnosticSeverity, Range, Uri } from "vscode";

export type DiagnosticCodeWithTarget = {
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

export type NotFoundCode = DiagnosticCode | DiagnosticCodeWithTarget;

export const notFound = (
    descriptor: string,
    match: string,
    range: Range,
    code: NotFoundCode,
): Diagnostic => ({
    message: `${descriptor} [${match}] not found.`,
    severity: DiagnosticSeverity.Warning,
    range,
    source: "Laravel Extension",
    code,
});
