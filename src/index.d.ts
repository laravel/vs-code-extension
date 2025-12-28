import * as vscode from "vscode";
import AutocompleteResult from "./parser/AutocompleteResult";

type CodeActionProviderFunction = (
    diagnostic: vscode.Diagnostic,
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    token: vscode.CancellationToken,
) => Promise<vscode.CodeAction[]>;

interface Config {
    name: string;
    value: string;
    file: string | null;
    line: string | null;
}

interface CompletionProvider {
    tags(): FeatureTag;
    customCheck?(result: AutocompleteResult, document: string): any;
    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[];
}

interface View {
    name: string;
    path: string;
}

type FeatureTag = FeatureTagParam | FeatureTagParam[];

type ValidDetectParamTypes = "string" | "array";

type HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
) => vscode.ProviderResult<vscode.Hover>;

type LinkProvider = (
    doc: vscode.TextDocument,
) => Promise<(vscode.DocumentLink | null)[]>;

interface FeatureTagParam {
    class?: string | string[] | null;
    method?: string | string[] | null;
    name?: string | string[] | null;
    argumentName?: string | string[];
    classDefinition?: string;
    methodDefinition?: string;
    classExtends?: string;
    classImplements?: string;
    argumentIndex?: number | number[];
}

declare namespace Eloquent {
    interface Result {
        models: Models;
        builderMethods: BuilderMethod[];
    }

    interface BuilderMethod {
        name: string;
        parameters: string[];
        return: string | null;
    }

    interface Models {
        [key: string]: Model;
    }

    interface Model {
        class: string;
        database: string;
        table: string;
        policy: string | null;
        attributes: Attribute[];
        relations: Relation[];
        events: Event[];
        observers: Observer[];
        scopes: Scope[];
        extends: string | null;
        name_cases: string[];
    }

    interface Attribute {
        name: string;
        type: string;
        increments: boolean;
        nullable: boolean;
        default: string | null;
        unique: boolean;
        fillable: boolean;
        hidden: boolean;
        appended: null;
        cast: string | null;
        title_case: string;
        name_cases: string[];
        documented: boolean;
    }

    interface Relation {
        name: string;
        type: string;
        related: string;
    }

    interface Event {
        event: string;
        class: string;
    }

    interface Observer {
        event: string;
        observer: string[];
    }

    interface Scope {
        name: string;
        parameters: ScopeParameter[];
    }

    interface ScopeParameter {
        name: string;
        type: string;
        default?: string | null;
        isOptional: boolean;
        isVariadic: boolean;
        isPassedByReference: boolean;
    }
}
