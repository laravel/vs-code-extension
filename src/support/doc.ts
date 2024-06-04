import { Position, Range, TextDocument } from "vscode";

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
