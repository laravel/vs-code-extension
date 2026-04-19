import {
    DocumentSymbol,
    Location,
    LocationLink,
    Position,
    SymbolInformation,
    Uri,
    commands,
} from "vscode";
import { getTargetUri } from "./renameUtils";

const isDocumentSymbol = (
    symbol: DocumentSymbol | SymbolInformation,
): symbol is DocumentSymbol => {
    return (symbol as DocumentSymbol).children !== undefined;
};

const toDocumentSymbol = (
    symbol: DocumentSymbol | SymbolInformation,
): DocumentSymbol => {
    if (isDocumentSymbol(symbol)) {
        return symbol;
    }

    const range = symbol.location.range;
    return new DocumentSymbol(
        symbol.name,
        symbol.containerName ?? "",
        symbol.kind,
        range,
        range,
    );
};

export const getDocumentSymbols = async (
    uri: Uri,
): Promise<DocumentSymbol[]> => {
    if (!uri) {
        return [];
    }

    const result = await commands.executeCommand<
        (DocumentSymbol | SymbolInformation)[]
    >("vscode.executeDocumentSymbolProvider", uri);

    return (result ?? []).map(toDocumentSymbol);
};

export const getDefinition = async (
    uri: Uri,
    position: Position,
): Promise<Location | LocationLink | null> => {
    const definitions = await commands.executeCommand<
        (Location | LocationLink)[]
    >("vscode.executeDefinitionProvider", uri, position);

    if (!definitions || definitions.length === 0) {
        return null;
    }

    return definitions[0];
};

export const getReferences = async (
    uri: Uri,
    position: Position,
): Promise<Location[]> => {
    const refs = await commands.executeCommand<Location[]>(
        "vscode.executeReferenceProvider",
        uri,
        position,
    );

    return refs ?? [];
};

export const getSymbol = async (
    uri: Uri,
    position: Position,
): Promise<[DocumentSymbol, Location | LocationLink] | null> => {
    const definition = await getDefinition(uri, position);

    if (!definition) {
        return null;
    }

    const targetUri = getTargetUri(definition);

    if (!targetUri) {
        return null;
    }

    const symbols = flattenDocumentSymbols(await getDocumentSymbols(targetUri));

    if ("targetRange" in definition) {
        for (const symbol of symbols) {
            if (definition.targetRange.contains(symbol.selectionRange)) {
                return [symbol, definition];
            }
        }
    }

    const references = await getReferences(uri, position);

    for (const reference of references) {
        for (const symbol of symbols) {
            if (symbol.selectionRange.contains(reference.range)) {
                return [symbol, definition];
            }
        }
    }

    return null;
};

const flattenDocumentSymbols = (
    symbols: DocumentSymbol[],
): DocumentSymbol[] => {
    const result: DocumentSymbol[] = [];

    const visit = (symbol: DocumentSymbol) => {
        result.push(symbol);
        for (const child of symbol.children ?? []) {
            visit(child);
        }
    };

    for (const symbol of symbols ?? []) {
        visit(symbol);
    }

    return result;
};
