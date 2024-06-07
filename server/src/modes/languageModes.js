/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageModes = exports.Color = exports.ColorPresentation = exports.ColorInformation = void 0;
const vscode_html_languageservice_1 = require("vscode-html-languageservice");
const protocol_colorProvider_proposed_1 = require("vscode-languageserver-protocol/lib/protocol.colorProvider.proposed");
Object.defineProperty(exports, "ColorInformation", { enumerable: true, get: function () { return protocol_colorProvider_proposed_1.ColorInformation; } });
Object.defineProperty(exports, "ColorPresentation", { enumerable: true, get: function () { return protocol_colorProvider_proposed_1.ColorPresentation; } });
Object.defineProperty(exports, "Color", { enumerable: true, get: function () { return protocol_colorProvider_proposed_1.Color; } });
const languageModelCache_1 = require("../languageModelCache");
const embeddedSupport_1 = require("./embeddedSupport");
const cssMode_1 = require("./cssMode");
const javascriptMode_1 = require("./javascriptMode");
const htmlMode_1 = require("./htmlMode");
function getLanguageModes(supportedLanguages) {
    var htmlLanguageService = (0, vscode_html_languageservice_1.getLanguageService)();
    let documentRegions = (0, languageModelCache_1.getLanguageModelCache)(10, 60, document => (0, embeddedSupport_1.getDocumentRegions)(htmlLanguageService, document));
    let modelCaches = [];
    modelCaches.push(documentRegions);
    let modes = Object.create(null);
    modes['html'] = (0, htmlMode_1.getHTMLMode)(htmlLanguageService);
    if (supportedLanguages['css']) {
        modes['css'] = (0, cssMode_1.getCSSMode)(documentRegions);
    }
    if (supportedLanguages['javascript']) {
        modes['javascript'] = (0, javascriptMode_1.getJavascriptMode)(documentRegions);
    }
    return {
        getModeAtPosition(document, position) {
            let languageId = documentRegions.get(document).getLanguageAtPosition(position);
            if (languageId) {
                return modes[languageId];
            }
            return void 0;
        },
        getModesInRange(document, range) {
            return documentRegions.get(document).getLanguageRanges(range).map(r => {
                return {
                    start: r.start,
                    end: r.end,
                    mode: r.languageId && modes[r.languageId],
                    attributeValue: r.attributeValue
                };
            });
        },
        getAllModesInDocument(document) {
            let result = [];
            for (let languageId of documentRegions.get(document).getLanguagesInDocument()) {
                let mode = modes[languageId];
                if (mode) {
                    result.push(mode);
                }
            }
            return result;
        },
        getAllModes() {
            let result = [];
            for (let languageId in modes) {
                let mode = modes[languageId];
                if (mode) {
                    result.push(mode);
                }
            }
            return result;
        },
        getMode(languageId) {
            return modes[languageId];
        },
        onDocumentRemoved(document) {
            modelCaches.forEach(mc => mc.onDocumentRemoved(document));
            for (let mode in modes) {
                modes[mode].onDocumentRemoved(document);
            }
        },
        dispose() {
            modelCaches.forEach(mc => mc.dispose());
            modelCaches = [];
            for (let mode in modes) {
                modes[mode].dispose();
            }
            modes = {};
        }
    };
}
exports.getLanguageModes = getLanguageModes;
//# sourceMappingURL=languageModes.js.map