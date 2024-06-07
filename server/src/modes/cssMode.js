/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCSSMode = void 0;
const languageModelCache_1 = require("../languageModelCache");
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const embeddedSupport_1 = require("./embeddedSupport");
function getCSSMode(documentRegions) {
    let cssLanguageService = (0, vscode_css_languageservice_1.getCSSLanguageService)();
    let embeddedCSSDocuments = (0, languageModelCache_1.getLanguageModelCache)(10, 60, document => documentRegions.get(document).getEmbeddedDocument('css'));
    let cssStylesheets = (0, languageModelCache_1.getLanguageModelCache)(10, 60, document => cssLanguageService.parseStylesheet(document));
    return {
        getId() {
            return 'css';
        },
        configure(options) {
            cssLanguageService.configure(options && options.css);
        },
        doValidation(document, settings) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.doValidation(embedded, cssStylesheets.get(embedded), settings && settings.css);
        },
        doComplete(document, position) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.doComplete(embedded, position, cssStylesheets.get(embedded));
        },
        setCompletionParticipants(registeredCompletionParticipants) {
            cssLanguageService.setCompletionParticipants(registeredCompletionParticipants);
        },
        doHover(document, position) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.doHover(embedded, position, cssStylesheets.get(embedded));
        },
        findDocumentHighlight(document, position) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.findDocumentHighlights(embedded, position, cssStylesheets.get(embedded));
        },
        findDocumentSymbols(document) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.findDocumentSymbols(embedded, cssStylesheets.get(embedded)).filter(s => s.name !== embeddedSupport_1.CSS_STYLE_RULE);
        },
        findDefinition(document, position) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.findDefinition(embedded, position, cssStylesheets.get(embedded));
        },
        findReferences(document, position) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.findReferences(embedded, position, cssStylesheets.get(embedded));
        },
        findDocumentColors(document) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.findDocumentColors(embedded, cssStylesheets.get(embedded));
        },
        getColorPresentations(document, color, range) {
            let embedded = embeddedCSSDocuments.get(document);
            return cssLanguageService.getColorPresentations(embedded, cssStylesheets.get(embedded), color, range);
        },
        onDocumentRemoved(document) {
            embeddedCSSDocuments.onDocumentRemoved(document);
            cssStylesheets.onDocumentRemoved(document);
        },
        dispose() {
            embeddedCSSDocuments.dispose();
            cssStylesheets.dispose();
        }
    };
}
exports.getCSSMode = getCSSMode;
//# sourceMappingURL=cssMode.js.map