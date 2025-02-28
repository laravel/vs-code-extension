import {
    SnippetString,
    Range,
    TextEditor,
    TextDocument,
    TextDocumentContentChangeEvent,
    commands,
    TextDocumentChangeEvent
} from 'vscode';

import { config } from '@src/support/config';

const TAG_DOUBLE = 0;
const TAG_UNESCAPED = 1;
const TAG_COMMENT = 2;

const charsForChange = (doc: TextDocument, change: TextDocumentContentChangeEvent) => {
    if (change.text === '!') {
        return 2;
    } else if (change.text === '-') {
        let start = change.range.start;
        let end = change.range.start;

        try {
            start = start.translate(0, -2);
            end = end.translate(0, -1);
        } catch (error) {
            // VS Code doesn't like negative numbers passed
            // to translate (even though it works fine), so
            // this block prevents debug console errors
        }

        let textRange = doc.getText(new Range(start, end));
        if (textRange === ' ') {
            return 4;
        }
        return 3;
    }
    return 1;
};

const spaceReplace = (editor: TextEditor, tagType: number, ranges: Array<Range>) => {
    const snippets: Record<number, string> = {
        [TAG_DOUBLE]: '{{ ${1:${TM_SELECTED_TEXT/[{}]//g}} }}$0',
        [TAG_UNESCAPED]: '{!! ${1:${TM_SELECTED_TEXT/[{} !]//g}} !!}$0',
        [TAG_COMMENT]: '{{-- ${1:${TM_SELECTED_TEXT/(--)|[{} ]//g}} --}}$0',
    };
    
    const snippet = snippets[tagType];
    if (snippet) {
        return editor.insertSnippet(new SnippetString(snippet), ranges);
    }
};


export const bladeSpacer = async (e: TextDocumentChangeEvent, editor?: TextEditor) => {
    if (!editor) {
        return;
    }

    const triggers = ['{}', '!', '-', '{', '%', '#'];
    const expressions = [
        /({{(?!\s|-))(.*?)(}})/,
        /({!!(?!\s))(.*?)?(}?)/,
        /({{[\s]?--)(.*?)?(}})/,
        /({%(?!\s))(.*?)?(}?)/,
        /({#(?!\s))(.*?)?(}?)/
    ];
    let tagType: number = -1;

    let ranges: Array<Range> = [];
    let offsets: Array<number> = [];

    // changes (per line) come in right-to-left when we need them left-to-right
    const changes = e.contentChanges.slice().reverse();

    changes.forEach((change) => {
        if (triggers.indexOf(change.text) !== -1) {
            if (!offsets[change.range.start.line]) {
                offsets[change.range.start.line] = 0;
            }

            let startOffset = offsets[change.range.start.line] - charsForChange(e.document, change);
            let start = change.range.start;
            try {
                start = start.translate(0, startOffset);
            } catch (error) {
                // VS Code doesn't like negative numbers passed
                // to translate (even though it works fine), so
                // this block prevents debug console errors
            }

            let lineEnd = e.document.lineAt(start.line).range.end;

            for (let i = 0; i < expressions.length; i++) {
                // if we typed a - or a !, don't consider the "double" tag type
                if (i === TAG_DOUBLE && ['-', '!'].indexOf(change.text) !== -1) {
                    continue;
                }

                // Only look at unescaped tags if we need to
                if (i === TAG_UNESCAPED && change.text !== '!') {
                    continue;
                }

                // Only look at unescaped tags if we need to
                if (i === TAG_COMMENT && change.text !== '-') {
                    continue;
                }

                let tag = expressions[i].exec(e.document.getText(new Range(start, lineEnd)));

                if (tag) {
                    tagType = i;
                    ranges.push(new Range(start, start.translate(0, tag[0].length)));
                    offsets[start.line] += tag[1].length;
                }
            }
        }
    });

    if (ranges.length > 0) {
        await spaceReplace(editor, tagType, ranges)?.then(async () => {
            try {
                await commands.executeCommand('extension.vim_escape');
                await commands.executeCommand('extension.vim_right');
                await commands.executeCommand('extension.vim_insert');
            } catch (error) {
                // We don't care if this fails, because it means the user
                // does NOT have the VSCodeVim extension installed
            }
        });
        ranges = [];
        tagType = -1;
    }
};
