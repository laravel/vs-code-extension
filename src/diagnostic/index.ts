import { Diagnostic, DiagnosticSeverity, Range } from "vscode";

export const notFound = (
    descriptor: string,
    match: string,
    range: Range,
): Diagnostic => ({
    message: `${descriptor} [${match}] not found.`,
    severity: DiagnosticSeverity.Warning,
    range,
    source: "Laravel Extension",
});
