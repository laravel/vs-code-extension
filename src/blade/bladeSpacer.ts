import { config } from "@src/support/config";
import {
    Position,
    Range,
    SnippetString,
    TextDocument,
    TextDocumentChangeEvent,
    TextDocumentContentChangeEvent,
    TextEditor,
} from "vscode";

const TAG_DOUBLE = 0;
const TAG_UNESCAPED = 1;
const TAG_COMMENT = 2;

const snippets: Record<number, string> = {
    [TAG_DOUBLE]: "{{ ${1:${TM_SELECTED_TEXT/[{}]//g}} }}$0",
    [TAG_UNESCAPED]: "{!! ${1:${TM_SELECTED_TEXT/[{} !]//g}} !!}$0",
    [TAG_COMMENT]: "{{-- ${1:${TM_SELECTED_TEXT/(--)|[{} ]//g}} --}}$0",
};

const triggers = ["{}", "!", "-", "{"];

const regexes = [
    /({{(?!\s|-))(.*?)(}})/,
    /({!!(?!\s))(.*?)?(}?)/,
    /({{[\s]?--)(.*?)?(}})/,
];

const translate = (position: Position, offset: number) => {
    try {
        return position.translate(0, offset);
    } catch (error) {
        // VS Code doesn't like negative numbers passed
        // to translate (even though it works fine), so
        // this block prevents debug console errors
    }

    return position;
};

const charsForChange = (
    doc: TextDocument,
    change: TextDocumentContentChangeEvent,
) => {
    if (change.text === "!") {
        return 2;
    }

    if (change.text !== "-") {
        return 1;
    }

    const start = translate(change.range.start, -2);
    const end = translate(change.range.start, -1);

    return doc.getText(new Range(start, end)) === " " ? 4 : 3;
};

export const bladeSpacer = async (
    e: TextDocumentChangeEvent,
    editor?: TextEditor,
) => {
    if (
        !config("blade.autoSpaceTags", true) ||
        !editor ||
        editor.document.fileName.indexOf(".blade.php") === -1
    ) {
        return;
    }

    let tagType: number = -1;
    let ranges: Range[] = [];
    let offsets: number[] = [];

    // Changes (per line) come in right-to-left when we need them left-to-right
    const changes = e.contentChanges.slice().reverse();

    changes.forEach((change) => {
        if (triggers.indexOf(change.text) === -1) {
            return;
        }

        if (!offsets[change.range.start.line]) {
            offsets[change.range.start.line] = 0;
        }

        const startOffset =
            offsets[change.range.start.line] -
            charsForChange(e.document, change);

        const start = translate(change.range.start, startOffset);
        const lineEnd = e.document.lineAt(start.line).range.end;

        for (let i = 0; i < regexes.length; i++) {
            // If we typed a - or a !, don't consider the "double" tag type
            if (i === TAG_DOUBLE && ["-", "!"].indexOf(change.text) !== -1) {
                continue;
            }

            // Only look at unescaped tags if we need to
            if (i === TAG_UNESCAPED && change.text !== "!") {
                continue;
            }

            // Only look at comment tags if we need to
            if (i === TAG_COMMENT && change.text !== "-") {
                continue;
            }

            const tag = regexes[i].exec(
                e.document.getText(new Range(start, lineEnd)),
            );

            if (tag) {
                tagType = i;
                ranges.push(
                    new Range(start, start.translate(0, tag[0].length)),
                );
                offsets[start.line] += tag[1].length;
            }
        }
    });

    if (ranges.length > 0 && snippets[tagType]) {
        editor.insertSnippet(new SnippetString(snippets[tagType]), ranges);
    }
};
