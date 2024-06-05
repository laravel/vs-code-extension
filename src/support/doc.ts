import {
    DocumentLink,
    Hover,
    Position,
    ProviderResult,
    Range,
    TextDocument,
    Uri,
} from "vscode";

// TODO: This doesn't really belong here, it has to do with Linking, but fine for now
export const findInDoc = (
    doc: TextDocument,
    regex: string,
    getItem: (match: RegExpExecArray) => Uri | null,
): DocumentLink[] => {
    return findMatchesInDoc(doc, regex, (match, range) => {
        const item = getItem(match);

        if (item === null) {
            return null;
        }

        return new DocumentLink(range, item);
    });
};

// TODO: This doesn't really belong here, it has to do with Hovering, but fine for now
export const getMatch = (
    doc: TextDocument,
    pos: Position,
    regex: string,
    cb: (match: string) => ProviderResult<Hover>,
): ProviderResult<Hover> => {
    const linkRange = doc.getWordRangeAtPosition(pos, new RegExp(regex));

    if (!linkRange) {
        return null;
    }

    return cb(doc.getText(linkRange));
};

export const findMatchesInDoc = <T>(
    doc: TextDocument,
    regex: string,
    cb: (match: RegExpExecArray, range: Range) => T | null,
): T[] => {
    let items: T[] = [];
    let newRegex = new RegExp(regex, "g");

    let index = 0;

    while (index < doc.lineCount) {
        let line = doc.lineAt(index);
        let match = newRegex.exec(line.text);

        if (match !== null) {
            let start = new Position(line.lineNumber, match.index);
            let end = start.translate(0, match[0].length);

            let item = cb(match, new Range(start, end));

            if (item === null) {
                continue;
            }

            items.push(item);
        }

        index++;
    }

    return items;
};
