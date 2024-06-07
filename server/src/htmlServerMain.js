/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const languageModes_1 = require("./modes/languageModes");
const protocol_configuration_proposed_1 = require("vscode-languageserver-protocol/lib/protocol.configuration.proposed");
const protocol_colorProvider_proposed_1 = require("vscode-languageserver-protocol/lib/protocol.colorProvider.proposed");
const protocol_workspaceFolders_proposed_1 = require("vscode-languageserver-protocol/lib/protocol.workspaceFolders.proposed");
const formatting_1 = require("./modes/formatting");
const arrays_1 = require("./utils/arrays");
const documentContext_1 = require("./utils/documentContext");
const vscode_uri_1 = __importDefault(require("vscode-uri"));
const errors_1 = require("./utils/errors");
const vscode_emmet_helper_1 = require("vscode-emmet-helper");
var TagCloseRequest;
(function (TagCloseRequest) {
    TagCloseRequest.type = new vscode_languageserver_1.RequestType('html/tag');
})(TagCloseRequest || (TagCloseRequest = {}));
// Create a connection for the server
let connection = (0, vscode_languageserver_1.createConnection)();
console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);
process.on('unhandledRejection', (e) => {
    connection.console.error((0, errors_1.formatError)(`Unhandled exception`, e));
});
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vscode_languageserver_1.TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
let workspaceFolders;
var languageModes;
let clientSnippetSupport = false;
let clientDynamicRegisterSupport = false;
let scopedSettingsSupport = false;
let workspaceFoldersSupport = false;
var globalSettings = {};
let documentSettings = {};
// remove document settings on close
documents.onDidClose(e => {
    delete documentSettings[e.document.uri];
});
function getDocumentSettings(textDocument, needsDocumentSettings) {
    if (scopedSettingsSupport && needsDocumentSettings()) {
        let promise = documentSettings[textDocument.uri];
        if (!promise) {
            let scopeUri = textDocument.uri;
            let configRequestParam = { items: [{ scopeUri, section: 'css' }, { scopeUri, section: 'html' }, { scopeUri, section: 'javascript' }] };
            promise = connection.sendRequest(protocol_configuration_proposed_1.ConfigurationRequest.type, configRequestParam).then(s => ({ css: s[0], html: s[1], javascript: s[2] }));
            documentSettings[textDocument.uri] = promise;
        }
        return promise;
    }
    return Promise.resolve(void 0);
}
let emmetSettings = {};
let currentEmmetExtensionsPath;
const emmetTriggerCharacters = ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize((params) => {
    let initializationOptions = params.initializationOptions;
    workspaceFolders = params.workspaceFolders;
    if (!Array.isArray(workspaceFolders)) {
        workspaceFolders = [];
        if (params.rootPath) {
            workspaceFolders.push({ name: '', uri: vscode_uri_1.default.file(params.rootPath).toString() });
        }
    }
    languageModes = (0, languageModes_1.getLanguageModes)(initializationOptions ? initializationOptions.embeddedLanguages : { css: true, javascript: true });
    documents.onDidClose(e => {
        languageModes.onDocumentRemoved(e.document);
    });
    connection.onShutdown(() => {
        languageModes.dispose();
    });
    function hasClientCapability(...keys) {
        let c = params.capabilities;
        for (let i = 0; c && i < keys.length; i++) {
            c = c[keys[i]];
        }
        return !!c;
    }
    clientSnippetSupport = hasClientCapability('textDocument', 'completion', 'completionItem', 'snippetSupport');
    clientDynamicRegisterSupport = hasClientCapability('workspace', 'symbol', 'dynamicRegistration');
    scopedSettingsSupport = hasClientCapability('workspace', 'configuration');
    workspaceFoldersSupport = hasClientCapability('workspace', 'workspaceFolders');
    let capabilities = {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: documents.syncKind,
        completionProvider: clientSnippetSupport ? { resolveProvider: true, triggerCharacters: [...emmetTriggerCharacters, '.', ':', '<', '"', '=', '/'] } : undefined,
        hoverProvider: true,
        documentHighlightProvider: true,
        documentRangeFormattingProvider: false,
        documentSymbolProvider: true,
        definitionProvider: true,
        signatureHelpProvider: { triggerCharacters: ['('] },
        referencesProvider: true,
        colorProvider: true
    };
    return { capabilities };
});
connection.onInitialized((p) => {
    if (workspaceFoldersSupport) {
        connection.client.register(protocol_workspaceFolders_proposed_1.DidChangeWorkspaceFoldersNotification.type);
        connection.onNotification(protocol_workspaceFolders_proposed_1.DidChangeWorkspaceFoldersNotification.type, e => {
            let toAdd = e.event.added;
            let toRemove = e.event.removed;
            let updatedFolders = [];
            if (workspaceFolders) {
                for (let folder of workspaceFolders) {
                    if (!toRemove.some(r => r.uri === folder.uri) && !toAdd.some(r => r.uri === folder.uri)) {
                        updatedFolders.push(folder);
                    }
                }
            }
            workspaceFolders = updatedFolders.concat(toAdd);
        });
    }
});
let formatterRegistration = null;
// The settings have changed. Is send on server activation as well.
connection.onDidChangeConfiguration((change) => {
    globalSettings = change.settings;
    documentSettings = {}; // reset all document settings
    languageModes.getAllModes().forEach(m => {
        if (m.configure) {
            m.configure(change.settings);
        }
    });
    documents.all().forEach(triggerValidation);
    // dynamically enable & disable the formatter
    if (clientDynamicRegisterSupport) {
        let enableFormatter = globalSettings && globalSettings.html && globalSettings.html.format && globalSettings.html.format.enable;
        if (enableFormatter) {
            if (!formatterRegistration) {
                let documentSelector = [{ language: 'html' }, { language: 'handlebars' }]; // don't register razor, the formatter does more harm than good
                formatterRegistration = connection.client.register(vscode_languageserver_1.DocumentRangeFormattingRequest.type, { documentSelector });
            }
        }
        else if (formatterRegistration) {
            formatterRegistration.then(r => r.dispose());
            formatterRegistration = null;
        }
    }
    emmetSettings = globalSettings.emmet;
    if (currentEmmetExtensionsPath !== emmetSettings['extensionsPath']) {
        currentEmmetExtensionsPath = emmetSettings['extensionsPath'];
        const workspaceUri = (workspaceFolders && workspaceFolders.length === 1) ? vscode_uri_1.default.parse(workspaceFolders[0].uri) : null;
        (0, vscode_emmet_helper_1.updateExtensionsPath)(currentEmmetExtensionsPath, workspaceUri ? workspaceUri.fsPath : null);
    }
});
let pendingValidationRequests = {};
const validationDelayMs = 500;
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    triggerValidation(change.document);
});
// a document has closed: clear all diagnostics
documents.onDidClose(event => {
    cleanPendingValidation(event.document);
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});
function cleanPendingValidation(textDocument) {
    let request = pendingValidationRequests[textDocument.uri];
    if (request) {
        clearTimeout(request);
        delete pendingValidationRequests[textDocument.uri];
    }
}
function triggerValidation(textDocument) {
    cleanPendingValidation(textDocument);
    pendingValidationRequests[textDocument.uri] = setTimeout(() => {
        delete pendingValidationRequests[textDocument.uri];
        validateTextDocument(textDocument);
    }, validationDelayMs);
}
function isValidationEnabled(languageId, settings = globalSettings) {
    let validationSettings = settings && settings.html && settings.html.validate;
    if (validationSettings) {
        return languageId === 'css' && validationSettings.styles !== false || languageId === 'javascript' && validationSettings.scripts !== false;
    }
    return true;
}
async function validateTextDocument(textDocument) {
    try {
        let diagnostics = [];
        if (textDocument.languageId === 'html') {
            let modes = languageModes.getAllModesInDocument(textDocument);
            let settings = await getDocumentSettings(textDocument, () => modes.some(m => !!m.doValidation));
            modes.forEach(mode => {
                if (mode.doValidation && isValidationEnabled(mode.getId(), settings)) {
                    (0, arrays_1.pushAll)(diagnostics, mode.doValidation(textDocument, settings));
                }
            });
        }
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    catch (e) {
        connection.console.error((0, errors_1.formatError)(`Error while validating ${textDocument.uri}`, e));
    }
}
let cachedCompletionList;
const hexColorRegex = /^#[\d,a-f,A-F]{1,6}$/;
connection.onCompletion(async (textDocumentPosition) => {
    return (0, errors_1.runSafe)(async () => {
        let document = documents.get(textDocumentPosition.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);
        if (!mode || !mode.doComplete) {
            return { isIncomplete: true, items: [] };
        }
        if (cachedCompletionList
            && !cachedCompletionList.isIncomplete
            && (mode.getId() === 'html' || mode.getId() === 'css')
            && textDocumentPosition.context
            && textDocumentPosition.context.triggerKind === vscode_languageserver_1.CompletionTriggerKind.TriggerForIncompleteCompletions) {
            let result = (0, vscode_emmet_helper_1.doComplete)(document, textDocumentPosition.position, mode.getId(), emmetSettings);
            if (result && result.items) {
                result.items.push(...cachedCompletionList.items);
            }
            else {
                result = cachedCompletionList;
                cachedCompletionList = null;
            }
            return result;
        }
        if (mode.getId() !== 'html') {
            connection.telemetry.logEvent({ key: 'html.embbedded.complete', value: { languageId: mode.getId() } });
        }
        cachedCompletionList = null;
        let emmetCompletionList = {
            isIncomplete: true,
            items: undefined
        };
        if (mode.setCompletionParticipants) {
            const emmetCompletionParticipant = (0, vscode_emmet_helper_1.getEmmetCompletionParticipants)(document, textDocumentPosition.position, mode.getId(), emmetSettings, emmetCompletionList);
            mode.setCompletionParticipants([emmetCompletionParticipant]);
        }
        let settings = await getDocumentSettings(document, () => mode.doComplete.length > 2);
        let result = mode.doComplete(document, textDocumentPosition.position, settings);
        if (emmetCompletionList && emmetCompletionList.items) {
            cachedCompletionList = result;
            if (emmetCompletionList.items.length && hexColorRegex.test(emmetCompletionList.items[0].label) && result.items.some(x => x.label === emmetCompletionList.items[0].label)) {
                emmetCompletionList.items.shift();
            }
            return { isIncomplete: true, items: [...emmetCompletionList.items, ...result.items] };
        }
        return result;
    }, null, `Error while computing completions for ${textDocumentPosition.textDocument.uri}`);
});
connection.onCompletionResolve(item => {
    return (0, errors_1.runSafe)(() => {
        let data = item.data;
        if (data && data.languageId && data.uri) {
            let mode = languageModes.getMode(data.languageId);
            let document = documents.get(data.uri);
            if (mode && mode.doResolve && document) {
                return mode.doResolve(document, item);
            }
        }
        return item;
    }, null, `Error while resolving completion proposal`);
});
connection.onHover(textDocumentPosition => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(textDocumentPosition.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);
        if (mode && mode.doHover) {
            return mode.doHover(document, textDocumentPosition.position);
        }
        return null;
    }, null, `Error while computing hover for ${textDocumentPosition.textDocument.uri}`);
});
connection.onDocumentHighlight(documentHighlightParams => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(documentHighlightParams.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, documentHighlightParams.position);
        if (mode && mode.findDocumentHighlight) {
            return mode.findDocumentHighlight(document, documentHighlightParams.position);
        }
        return [];
    }, [], `Error while computing document highlights for ${documentHighlightParams.textDocument.uri}`);
});
connection.onDefinition(definitionParams => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(definitionParams.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, definitionParams.position);
        if (mode && mode.findDefinition) {
            return mode.findDefinition(document, definitionParams.position);
        }
        return [];
    }, null, `Error while computing definitions for ${definitionParams.textDocument.uri}`);
});
connection.onReferences(referenceParams => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(referenceParams.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, referenceParams.position);
        if (mode && mode.findReferences) {
            return mode.findReferences(document, referenceParams.position);
        }
        return [];
    }, [], `Error while computing references for ${referenceParams.textDocument.uri}`);
});
connection.onSignatureHelp(signatureHelpParms => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(signatureHelpParms.textDocument.uri);
        let mode = languageModes.getModeAtPosition(document, signatureHelpParms.position);
        if (mode && mode.doSignatureHelp) {
            return mode.doSignatureHelp(document, signatureHelpParms.position);
        }
        return null;
    }, null, `Error while computing signature help for ${signatureHelpParms.textDocument.uri}`);
});
connection.onDocumentRangeFormatting(async (formatParams) => {
    return (0, errors_1.runSafe)(async () => {
        let document = documents.get(formatParams.textDocument.uri);
        let settings = await getDocumentSettings(document, () => true);
        if (!settings) {
            settings = globalSettings;
        }
        let unformattedTags = settings && settings.html && settings.html.format && settings.html.format.unformatted || '';
        let enabledModes = { css: !unformattedTags.match(/\bstyle\b/), javascript: !unformattedTags.match(/\bscript\b/) };
        return (0, formatting_1.format)(languageModes, document, formatParams.range, formatParams.options, settings, enabledModes);
    }, [], `Error while formatting range for ${formatParams.textDocument.uri}`);
});
connection.onDocumentLinks(documentLinkParam => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(documentLinkParam.textDocument.uri);
        let links = [];
        if (document) {
            let documentContext = (0, documentContext_1.getDocumentContext)(document.uri, workspaceFolders);
            languageModes.getAllModesInDocument(document).forEach(m => {
                if (m.findDocumentLinks) {
                    (0, arrays_1.pushAll)(links, m.findDocumentLinks(document, documentContext));
                }
            });
        }
        return links;
    }, [], `Error while document links for ${documentLinkParam.textDocument.uri}`);
});
connection.onDocumentSymbol(documentSymbolParms => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(documentSymbolParms.textDocument.uri);
        let symbols = [];
        languageModes.getAllModesInDocument(document).forEach(m => {
            if (m.findDocumentSymbols) {
                (0, arrays_1.pushAll)(symbols, m.findDocumentSymbols(document));
            }
        });
        return symbols;
    }, [], `Error while computing document symbols for ${documentSymbolParms.textDocument.uri}`);
});
connection.onRequest(protocol_colorProvider_proposed_1.DocumentColorRequest.type, params => {
    return (0, errors_1.runSafe)(() => {
        let infos = [];
        let document = documents.get(params.textDocument.uri);
        if (document) {
            languageModes.getAllModesInDocument(document).forEach(m => {
                if (m.findDocumentColors) {
                    (0, arrays_1.pushAll)(infos, m.findDocumentColors(document));
                }
            });
        }
        return infos;
    }, [], `Error while computing document colors for ${params.textDocument.uri}`);
});
connection.onRequest(protocol_colorProvider_proposed_1.ColorPresentationRequest.type, params => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(params.textDocument.uri);
        if (document) {
            let mode = languageModes.getModeAtPosition(document, params.range.start);
            if (mode && mode.getColorPresentations) {
                return mode.getColorPresentations(document, params.color, params.range);
            }
        }
        return [];
    }, [], `Error while computing color presentations for ${params.textDocument.uri}`);
});
connection.onRequest(TagCloseRequest.type, params => {
    return (0, errors_1.runSafe)(() => {
        let document = documents.get(params.textDocument.uri);
        if (document) {
            let pos = params.position;
            if (pos.character > 0) {
                let mode = languageModes.getModeAtPosition(document, vscode_languageserver_1.Position.create(pos.line, pos.character - 1));
                if (mode && mode.doAutoClose) {
                    return mode.doAutoClose(document, pos);
                }
            }
        }
        return null;
    }, null, `Error while computing tag close actions for ${params.textDocument.uri}`);
});
// Listen on the connection
connection.listen();
//# sourceMappingURL=htmlServerMain.js.map