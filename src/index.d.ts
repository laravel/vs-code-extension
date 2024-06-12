import * as vscode from "vscode";

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

interface Model {
    fqn: string;
    attributes: {
        default: string;
        camel: string;
        snake: string;
    }[];
    accessors: string[];
    relations: string[];
    camelCase: string;
    snakeCase: string;
    pluralCamelCase: string;
    pluralSnakeCase: string;
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
