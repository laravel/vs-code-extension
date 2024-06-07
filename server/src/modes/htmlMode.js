/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHTMLMode = void 0;
const languageModelCache_1 = require("../languageModelCache");
const vscode_html_languageservice_1 = require("vscode-html-languageservice");
function getHTMLMode(htmlLanguageService) {
    let globalSettings = {};
    let htmlDocuments = (0, languageModelCache_1.getLanguageModelCache)(10, 60, document => htmlLanguageService.parseHTMLDocument(document));
    let completionParticipants = [];
    return {
        getId() {
            return 'html';
        },
        configure(options) {
            globalSettings = options;
        },
        doComplete(document, position, settings = globalSettings) {
            let options = settings && settings.html && settings.html.suggest;
            let doAutoComplete = settings && settings.html && settings.html.autoClosingTags;
            if (doAutoComplete) {
                options.hideAutoCompleteProposals = true;
            }
            const htmlDocument = htmlDocuments.get(document);
            const offset = document.offsetAt(position);
            const node = htmlDocument.findNodeBefore(offset);
            const scanner = htmlLanguageService.createScanner(document.getText(), node.start);
            let token = scanner.scan();
            while (token !== vscode_html_languageservice_1.TokenType.EOS && scanner.getTokenOffset() <= offset) {
                if (token === vscode_html_languageservice_1.TokenType.Content && offset <= scanner.getTokenEnd()) {
                    completionParticipants.forEach(participant => { if (participant.onHtmlContent) {
                        participant.onHtmlContent();
                    } });
                    break;
                }
                token = scanner.scan();
            }
            return htmlLanguageService.doComplete(document, position, htmlDocument, options);
        },
        setCompletionParticipants(registeredCompletionParticipants) {
            completionParticipants = registeredCompletionParticipants;
        },
        doHover(document, position) {
            return htmlLanguageService.doHover(document, position, htmlDocuments.get(document));
        },
        findDocumentHighlight(document, position) {
            return htmlLanguageService.findDocumentHighlights(document, position, htmlDocuments.get(document));
        },
        findDocumentLinks(document, documentContext) {
            return htmlLanguageService.findDocumentLinks(document, documentContext);
        },
        findDocumentSymbols(document) {
            return htmlLanguageService.findDocumentSymbols(document, htmlDocuments.get(document));
        },
        format(document, range, formatParams, settings = globalSettings) {
            let formatSettings = settings && settings.html && settings.html.format;
            if (formatSettings) {
                formatSettings = merge(formatSettings, {});
            }
            else {
                formatSettings = {};
            }
            if (formatSettings.contentUnformatted) {
                formatSettings.contentUnformatted = formatSettings.contentUnformatted + ',script';
            }
            else {
                formatSettings.contentUnformatted = 'script';
            }
            formatSettings = merge(formatParams, formatSettings);
            return htmlLanguageService.format(document, range, formatSettings);
        },
        doAutoClose(document, position) {
            let offset = document.offsetAt(position);
            let text = document.getText();
            if (offset > 0 && text.charAt(offset - 1).match(/[>\/]/g)) {
                return htmlLanguageService.doTagComplete(document, position, htmlDocuments.get(document));
            }
            return null;
        },
        onDocumentRemoved(document) {
            htmlDocuments.onDocumentRemoved(document);
        },
        dispose() {
            htmlDocuments.dispose();
        }
    };
}
exports.getHTMLMode = getHTMLMode;
function merge(src, dst) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            dst[key] = src[key];
        }
    }
    return dst;
}
//# sourceMappingURL=htmlMode.js.map