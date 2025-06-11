import { repository } from "@src/repositories";
import { AutocompleteParsingResult } from "@src/types";
import {
    Diagnostic,
    DocumentLink,
    Hover,
    Position,
    ProviderResult,
    Range,
    TextDocument,
    Uri,
} from "vscode";
import { FeatureTag, ValidDetectParamTypes } from "..";
import { detectInDoc, isInHoverRange } from "./parser";

export const findWarningsInDoc = (
    doc: TextDocument,
    regex: string,
    cb: (match: RegExpExecArray, range: Range) => Promise<Diagnostic | null>,
    matchIndex: number = 0,
): Promise<Diagnostic[]> => {
    return findMatchesInDocAsync(
        doc,
        regex,
        (match, range) => {
            return cb(match, range);
        },
        matchIndex,
    ).then((items) => items.filter((item) => item !== null));
};

export const findLinksInDoc = (
    doc: TextDocument,
    regex: string,
    cb: (match: RegExpExecArray) => Uri | null,
    matchIndex: number = 0,
): DocumentLink[] => {
    return findMatchesInDoc(
        doc,
        regex,
        (match, range) => {
            const item = cb(match);

            if (item === null) {
                return null;
            }

            return new DocumentLink(range, item);
        },
        matchIndex,
    );
};

// TODO: This doesn't really belong here, it has to do with Hovering, but fine for now
export const findHoverMatchesInDoc = (
    doc: TextDocument,
    pos: Position,
    toFind: FeatureTag,
    repo: ReturnType<typeof repository>,
    cb: (
        match: string,
        arg: {
            param: AutocompleteParsingResult.StringValue;
            index: number;
            item: AutocompleteParsingResult.ContextValue;
        },
    ) => ProviderResult<Hover>,
    validParamTypes?: ValidDetectParamTypes[],
): ProviderResult<Hover> => {
    const linkRange = doc.getWordRangeAtPosition(
        pos,
        new RegExp(/(?<!=)(?<!\\)(['"])(.*?)(?<!\\)\1/),
    );

    if (!linkRange) {
        return null;
    }

    return detectInDoc<ProviderResult<Hover>, "string" | "array">(
        doc,
        toFind,
        repo,
        ({ param, index, item }) => {
            if (param.type === "string") {
                if (!isInHoverRange(linkRange, param)) {
                    return null;
                }

                return cb(doc.getText(linkRange).replace(/^['"]|['"]$/g, ""), {
                    param,
                    index,
                    item,
                });
            }

            if (param.type === "array") {
                const value = param.children.find(
                    ({ value }) =>
                        value?.type === "string" &&
                        isInHoverRange(linkRange, value),
                ) as AutocompleteParsingResult.StringValue | undefined;

                if (!value) {
                    return null;
                }

                return cb(doc.getText(linkRange).replace(/^['"]|['"]$/g, ""), {
                    param: value,
                    index,
                    item,
                });
            }

            return null;
        },
        validParamTypes,
    ).then(
        (results) => results.flat().find((result) => result !== null) || null,
    );
};

// TODO: This is a duplication of findMatchesInDocAsync, but I don't want to change it right now
export const findMatchesInDocAsync = async <T>(
    doc: TextDocument,
    regex: string,
    cb: (match: RegExpExecArray, range: Range) => Promise<T | null>,
    matchIndex: number = 0,
): Promise<T[]> => {
    let items: T[] = [];
    let index = 0;

    while (index < doc.lineCount) {
        let finalRegex = new RegExp(regex, "gd");
        let line = doc.lineAt(index);
        let match = finalRegex.exec(line.text);

        if (match !== null) {
            let start = new Position(
                line.lineNumber,
                match.indices?.[matchIndex][0] || match.index,
            );
            let end = start.translate(0, match[matchIndex].length);

            let item = await cb(match, new Range(start, end));

            if (item !== null) {
                items.push(item);
            }
        }

        index++;
    }

    return items;
};

export const findMatchesInDoc = <T>(
    doc: TextDocument,
    regex: string,
    cb: (match: RegExpExecArray, range: Range) => T | null,
    matchIndex: number = 0,
): T[] => {
    let items: T[] = [];
    let index = 0;

    while (index < doc.lineCount) {
        let finalRegex = new RegExp(regex, "gd");
        let line = doc.lineAt(index);
        let match = finalRegex.exec(line.text);

        if (match !== null) {
            let start = new Position(
                line.lineNumber,
                match.indices?.[matchIndex][0] || match.index,
            );
            let end = start.translate(0, match[matchIndex].length);

            let item = cb(match, new Range(start, end));

            if (item !== null) {
                items.push(item);
            }
        }

        index++;
    }

    return items;
};
