import * as vscode from "vscode";
import ParsingResult from "./parser/ParsingResult";

type Tags = Tag[];

interface Tag {
    class?: string;
    functions?: string[];
    classDefinition?: string;
    functionDefinition?: string;
    classExtends?: string;
    classImplements?: string;
}

interface ParsingResult<AdditionalInfo = any> {
    class: string | null;
    fqn: string | null;
    function: string | null;
    classDefinition: string | null;
    classExtends: string | null;
    classImplements: string[];
    functionDefinition: string | null;
    additionalInfo: AdditionalInfo;
    param: {
        index: number;
        isArray: boolean;
        isKey: boolean;
        key: string | null;
        keys: string[];
    };
    parameters: string[];
}

interface Config {
    [key: string]: any;
}

interface ConfigItem {
    name: string;
    value: string;
    uri?: vscode.Uri;
}

interface CompletionProvider {
    tags(): Tags;
    customCheck?(result: ParsingResult, document: string): any;
    provideCompletionItems(
        result: ParsingResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[];
}

interface View {
    name: string;
    relativePath: string;
    uri: vscode.Uri;
}

type HoverProvider = (
    doc: vscode.TextDocument,
    pos: vscode.Position,
) => vscode.ProviderResult<vscode.Hover>;

type LinkProvider = (doc: vscode.TextDocument) => vscode.DocumentLink[];

declare namespace Eloquent {
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
        scopes: string[];
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
}
