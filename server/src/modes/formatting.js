/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = void 0;
const edits_1 = require("../utils/edits");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const arrays_1 = require("../utils/arrays");
const strings_1 = require("../utils/strings");
function format(languageModes, document, formatRange, formattingOptions, settings, enabledModes) {
    let result = [];
    let endPos = formatRange.end;
    let endOffset = document.offsetAt(endPos);
    let content = document.getText();
    if (endPos.character === 0 && endPos.line > 0 && endOffset !== content.length) {
        // if selection ends after a new line, exclude that new line
        let prevLineStart = document.offsetAt(vscode_languageserver_types_1.Position.create(endPos.line - 1, 0));
        while ((0, strings_1.isEOL)(content, endOffset - 1) && endOffset > prevLineStart) {
            endOffset--;
        }
        formatRange = vscode_languageserver_types_1.Range.create(formatRange.start, document.positionAt(endOffset));
    }
    // run the html formatter on the full range and pass the result content to the embedded formatters.
    // from the final content create a single edit
    // advantages of this approach are
    //  - correct indents in the html document
    //  - correct initial indent for embedded formatters
    //  - no worrying of overlapping edits
    // make sure we start in html
    let allRanges = languageModes.getModesInRange(document, formatRange);
    let i = 0;
    let startPos = formatRange.start;
    let isHTML = (range) => range.mode && range.mode.getId() === 'html';
    while (i < allRanges.length && !isHTML(allRanges[i])) {
        let range = allRanges[i];
        if (!range.attributeValue && range.mode && range.mode.format) {
            let edits = range.mode.format(document, vscode_languageserver_types_1.Range.create(startPos, range.end), formattingOptions, settings);
            (0, arrays_1.pushAll)(result, edits);
        }
        startPos = range.end;
        i++;
    }
    if (i === allRanges.length) {
        return result;
    }
    // modify the range
    formatRange = vscode_languageserver_types_1.Range.create(startPos, formatRange.end);
    // perform a html format and apply changes to a new document
    let htmlMode = languageModes.getMode('html');
    let htmlEdits = htmlMode.format(document, formatRange, formattingOptions, settings);
    let htmlFormattedContent = (0, edits_1.applyEdits)(document, htmlEdits);
    let newDocument = vscode_languageserver_types_1.TextDocument.create(document.uri + '.tmp', document.languageId, document.version, htmlFormattedContent);
    try {
        // run embedded formatters on html formatted content: - formatters see correct initial indent
        let afterFormatRangeLength = document.getText().length - document.offsetAt(formatRange.end); // length of unchanged content after replace range
        let newFormatRange = vscode_languageserver_types_1.Range.create(formatRange.start, newDocument.positionAt(htmlFormattedContent.length - afterFormatRangeLength));
        let embeddedRanges = languageModes.getModesInRange(newDocument, newFormatRange);
        let embeddedEdits = [];
        for (let r of embeddedRanges) {
            let mode = r.mode;
            if (mode && mode.format && enabledModes[mode.getId()] && !r.attributeValue) {
                let edits = mode.format(newDocument, r, formattingOptions, settings);
                for (let edit of edits) {
                    embeddedEdits.push(edit);
                }
            }
        }
        if (embeddedEdits.length === 0) {
            (0, arrays_1.pushAll)(result, htmlEdits);
            return result;
        }
        // apply all embedded format edits and create a single edit for all changes
        let resultContent = (0, edits_1.applyEdits)(newDocument, embeddedEdits);
        let resultReplaceText = resultContent.substring(document.offsetAt(formatRange.start), resultContent.length - afterFormatRangeLength);
        result.push(vscode_languageserver_types_1.TextEdit.replace(formatRange, resultReplaceText));
        return result;
    }
    finally {
        languageModes.onDocumentRemoved(newDocument);
    }
}
exports.format = format;
//# sourceMappingURL=formatting.js.map