import { AutocompleteParsingResult } from "@src/types";
import { Diagnostic, DiagnosticSeverity, Range, Uri } from "vscode";

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

export class DiagnosticWithContext extends Diagnostic {
    context?: AutocompleteParsingResult.ContextValue;
}

export const notFound = (
    descriptor: string,
    match: string,
    range: Range,
    code: DiagnosticCode,
    context?: AutocompleteParsingResult.ContextValue,
): DiagnosticWithContext => ({
    message: `${descriptor} [${match}] not found.`,
    severity: DiagnosticSeverity.Warning,
    range,
    source: "Laravel Extension",
    code,
    context,
});
