/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJavascriptMode = void 0;
const languageModelCache_1 = require("../languageModelCache");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const strings_1 = require("../utils/strings");
const ts = __importStar(require("typescript"));
const path_1 = require("path");
const FILE_NAME = 'vscode://javascript/1'; // the same 'file' is used for all contents
const JQUERY_D_TS = (0, path_1.join)(__dirname, '../../lib/jquery.d.ts');
const JS_WORD_REGEX = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
function getJavascriptMode(documentRegions) {
    let jsDocuments = (0, languageModelCache_1.getLanguageModelCache)(10, 60, document => documentRegions.get(document).getEmbeddedDocument('javascript'));
    let compilerOptions = { allowNonTsExtensions: true, allowJs: true, lib: ['lib.es6.d.ts'], target: ts.ScriptTarget.Latest, moduleResolution: ts.ModuleResolutionKind.Classic };
    let currentTextDocument;
    let scriptFileVersion = 0;
    function updateCurrentTextDocument(doc) {
        if (!currentTextDocument || doc.uri !== currentTextDocument.uri || doc.version !== currentTextDocument.version) {
            currentTextDocument = jsDocuments.get(doc);
            scriptFileVersion++;
        }
    }
    const host = {
        getCompilationSettings: () => compilerOptions,
        getScriptFileNames: () => [FILE_NAME, JQUERY_D_TS],
        getScriptKind: () => ts.ScriptKind.JS,
        getScriptVersion: (fileName) => {
            if (fileName === FILE_NAME) {
                return String(scriptFileVersion);
            }
            return '1'; // default lib an jquery.d.ts are static
        },
        getScriptSnapshot: (fileName) => {
            let text = '';
            if ((0, strings_1.startsWith)(fileName, 'vscode:')) {
                if (fileName === FILE_NAME) {
                    text = currentTextDocument.getText();
                }
            }
            else {
                text = ts.sys.readFile(fileName) || '';
            }
            return {
                getText: (start, end) => text.substring(start, end),
                getLength: () => text.length,
                getChangeRange: () => void 0
            };
        },
        getCurrentDirectory: () => '',
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options)
    };
    let jsLanguageService = ts.createLanguageService(host);
    let globalSettings = {};
    return {
        getId() {
            return 'javascript';
        },
        configure(options) {
            globalSettings = options;
        },
        doValidation(document) {
            updateCurrentTextDocument(document);
            const syntaxDiagnostics = jsLanguageService.getSyntacticDiagnostics(FILE_NAME);
            const semanticDiagnostics = jsLanguageService.getSemanticDiagnostics(FILE_NAME);
            return syntaxDiagnostics.concat(semanticDiagnostics).map((diag) => {
                return {
                    range: convertRange(currentTextDocument, diag),
                    severity: vscode_languageserver_types_1.DiagnosticSeverity.Error,
                    source: 'js',
                    message: ts.flattenDiagnosticMessageText(diag.messageText, '\n')
                };
            });
        },
        doComplete(document, position) {
            updateCurrentTextDocument(document);
            let offset = currentTextDocument.offsetAt(position);
            let completions = jsLanguageService.getCompletionsAtPosition(FILE_NAME, offset, { includeExternalModuleExports: false, includeInsertTextCompletions: false });
            if (!completions) {
                return { isIncomplete: false, items: [] };
            }
            let replaceRange = convertRange(currentTextDocument, (0, strings_1.getWordAtText)(currentTextDocument.getText(), offset, JS_WORD_REGEX));
            return {
                isIncomplete: false,
                items: completions.entries.map(entry => {
                    return {
                        uri: document.uri,
                        position: position,
                        label: entry.name,
                        sortText: entry.sortText,
                        kind: convertKind(entry.kind),
                        textEdit: vscode_languageserver_types_1.TextEdit.replace(replaceRange, entry.name),
                        data: {
                            languageId: 'javascript',
                            uri: document.uri,
                            offset: offset
                        }
                    };
                })
            };
        },
        doResolve(document, item) {
            updateCurrentTextDocument(document);
            let details = jsLanguageService.getCompletionEntryDetails(FILE_NAME, item.data.offset, item.label, undefined, undefined);
            if (details) {
                item.detail = ts.displayPartsToString(details.displayParts);
                item.documentation = ts.displayPartsToString(details.documentation);
                delete item.data;
            }
            return item;
        },
        doHover(document, position) {
            updateCurrentTextDocument(document);
            let info = jsLanguageService.getQuickInfoAtPosition(FILE_NAME, currentTextDocument.offsetAt(position));
            if (info) {
                let contents = ts.displayPartsToString(info.displayParts);
                return {
                    range: convertRange(currentTextDocument, info.textSpan),
                    contents: vscode_languageserver_types_1.MarkedString.fromPlainText(contents)
                };
            }
            return null;
        },
        doSignatureHelp(document, position) {
            updateCurrentTextDocument(document);
            let signHelp = jsLanguageService.getSignatureHelpItems(FILE_NAME, currentTextDocument.offsetAt(position));
            if (signHelp) {
                let ret = {
                    activeSignature: signHelp.selectedItemIndex,
                    activeParameter: signHelp.argumentIndex,
                    signatures: []
                };
                signHelp.items.forEach(item => {
                    let signature = {
                        label: '',
                        documentation: undefined,
                        parameters: []
                    };
                    signature.label += ts.displayPartsToString(item.prefixDisplayParts);
                    item.parameters.forEach((p, i, a) => {
                        let label = ts.displayPartsToString(p.displayParts);
                        let parameter = {
                            label: label,
                            documentation: ts.displayPartsToString(p.documentation)
                        };
                        signature.label += label;
                        signature.parameters.push(parameter);
                        if (i < a.length - 1) {
                            signature.label += ts.displayPartsToString(item.separatorDisplayParts);
                        }
                    });
                    signature.label += ts.displayPartsToString(item.suffixDisplayParts);
                    ret.signatures.push(signature);
                });
                return ret;
            }
            return null;
        },
        findDocumentHighlight(document, position) {
            updateCurrentTextDocument(document);
            let occurrences = jsLanguageService.getOccurrencesAtPosition(FILE_NAME, currentTextDocument.offsetAt(position));
            if (occurrences) {
                return occurrences.map(entry => {
                    return {
                        range: convertRange(currentTextDocument, entry.textSpan),
                        kind: (entry.isWriteAccess ? vscode_languageserver_types_1.DocumentHighlightKind.Write : vscode_languageserver_types_1.DocumentHighlightKind.Text)
                    };
                });
            }
            return [];
        },
        findDocumentSymbols(document) {
            updateCurrentTextDocument(document);
            let items = jsLanguageService.getNavigationBarItems(FILE_NAME);
            if (items) {
                let result = [];
                let existing = Object.create(null);
                let collectSymbols = (item, containerLabel) => {
                    let sig = item.text + item.kind + item.spans[0].start;
                    if (item.kind !== 'script' && !existing[sig]) {
                        let symbol = {
                            name: item.text,
                            kind: convertSymbolKind(item.kind),
                            location: {
                                uri: document.uri,
                                range: convertRange(currentTextDocument, item.spans[0])
                            },
                            containerName: containerLabel
                        };
                        existing[sig] = true;
                        result.push(symbol);
                        containerLabel = item.text;
                    }
                    if (item.childItems && item.childItems.length > 0) {
                        for (let child of item.childItems) {
                            collectSymbols(child, containerLabel);
                        }
                    }
                };
                items.forEach(item => collectSymbols(item));
                return result;
            }
            return [];
        },
        findDefinition(document, position) {
            updateCurrentTextDocument(document);
            let definition = jsLanguageService.getDefinitionAtPosition(FILE_NAME, currentTextDocument.offsetAt(position));
            if (definition) {
                return definition.filter(d => d.fileName === FILE_NAME).map(d => {
                    return {
                        uri: document.uri,
                        range: convertRange(currentTextDocument, d.textSpan)
                    };
                });
            }
            return null;
        },
        findReferences(document, position) {
            updateCurrentTextDocument(document);
            let references = jsLanguageService.getReferencesAtPosition(FILE_NAME, currentTextDocument.offsetAt(position));
            if (references) {
                return references.filter(d => d.fileName === FILE_NAME).map(d => {
                    return {
                        uri: document.uri,
                        range: convertRange(currentTextDocument, d.textSpan)
                    };
                });
            }
            return [];
        },
        format(document, range, formatParams, settings = globalSettings) {
            currentTextDocument = documentRegions.get(document).getEmbeddedDocument('javascript', true);
            scriptFileVersion++;
            let formatterSettings = settings && settings.javascript && settings.javascript.format;
            let initialIndentLevel = computeInitialIndent(document, range, formatParams);
            let formatSettings = convertOptions(formatParams, formatterSettings, initialIndentLevel + 1);
            let start = currentTextDocument.offsetAt(range.start);
            let end = currentTextDocument.offsetAt(range.end);
            let lastLineRange = null;
            if (range.end.line > range.start.line && (range.end.character === 0 || (0, strings_1.isWhitespaceOnly)(currentTextDocument.getText().substr(end - range.end.character, range.end.character)))) {
                end -= range.end.character;
                lastLineRange = vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(range.end.line, 0), range.end);
            }
            let edits = jsLanguageService.getFormattingEditsForRange(FILE_NAME, start, end, formatSettings);
            if (edits) {
                let result = [];
                for (let edit of edits) {
                    if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
                        result.push({
                            range: convertRange(currentTextDocument, edit.span),
                            newText: edit.newText
                        });
                    }
                }
                if (lastLineRange) {
                    result.push({
                        range: lastLineRange,
                        newText: generateIndent(initialIndentLevel, formatParams)
                    });
                }
                return result;
            }
            return [];
        },
        onDocumentRemoved(document) {
            jsDocuments.onDocumentRemoved(document);
        },
        dispose() {
            jsLanguageService.dispose();
            jsDocuments.dispose();
        }
    };
}
exports.getJavascriptMode = getJavascriptMode;
function convertRange(document, span) {
    if (typeof span.start === 'undefined') {
        const pos = document.positionAt(0);
        return vscode_languageserver_types_1.Range.create(pos, pos);
    }
    const startPosition = document.positionAt(span.start);
    const endPosition = document.positionAt(span.start + (span.length || 0));
    return vscode_languageserver_types_1.Range.create(startPosition, endPosition);
}
function convertKind(kind) {
    switch (kind) {
        case 'primitive type':
        case 'keyword':
            return vscode_languageserver_types_1.CompletionItemKind.Keyword;
        case 'var':
        case 'local var':
            return vscode_languageserver_types_1.CompletionItemKind.Variable;
        case 'property':
        case 'getter':
        case 'setter':
            return vscode_languageserver_types_1.CompletionItemKind.Field;
        case 'function':
        case 'method':
        case 'construct':
        case 'call':
        case 'index':
            return vscode_languageserver_types_1.CompletionItemKind.Function;
        case 'enum':
            return vscode_languageserver_types_1.CompletionItemKind.Enum;
        case 'module':
            return vscode_languageserver_types_1.CompletionItemKind.Module;
        case 'class':
            return vscode_languageserver_types_1.CompletionItemKind.Class;
        case 'interface':
            return vscode_languageserver_types_1.CompletionItemKind.Interface;
        case 'warning':
            return vscode_languageserver_types_1.CompletionItemKind.File;
    }
    return vscode_languageserver_types_1.CompletionItemKind.Property;
}
function convertSymbolKind(kind) {
    switch (kind) {
        case 'var':
        case 'local var':
        case 'const':
            return vscode_languageserver_types_1.SymbolKind.Variable;
        case 'function':
        case 'local function':
            return vscode_languageserver_types_1.SymbolKind.Function;
        case 'enum':
            return vscode_languageserver_types_1.SymbolKind.Enum;
        case 'module':
            return vscode_languageserver_types_1.SymbolKind.Module;
        case 'class':
            return vscode_languageserver_types_1.SymbolKind.Class;
        case 'interface':
            return vscode_languageserver_types_1.SymbolKind.Interface;
        case 'method':
            return vscode_languageserver_types_1.SymbolKind.Method;
        case 'property':
        case 'getter':
        case 'setter':
            return vscode_languageserver_types_1.SymbolKind.Property;
    }
    return vscode_languageserver_types_1.SymbolKind.Variable;
}
function convertOptions(options, formatSettings, initialIndentLevel) {
    return {
        ConvertTabsToSpaces: options.insertSpaces,
        TabSize: options.tabSize,
        IndentSize: options.tabSize,
        IndentStyle: ts.IndentStyle.Smart,
        NewLineCharacter: '\n',
        BaseIndentSize: options.tabSize * initialIndentLevel,
        InsertSpaceAfterCommaDelimiter: Boolean(!formatSettings || formatSettings.insertSpaceAfterCommaDelimiter),
        InsertSpaceAfterSemicolonInForStatements: Boolean(!formatSettings || formatSettings.insertSpaceAfterSemicolonInForStatements),
        InsertSpaceBeforeAndAfterBinaryOperators: Boolean(!formatSettings || formatSettings.insertSpaceBeforeAndAfterBinaryOperators),
        InsertSpaceAfterKeywordsInControlFlowStatements: Boolean(!formatSettings || formatSettings.insertSpaceAfterKeywordsInControlFlowStatements),
        InsertSpaceAfterFunctionKeywordForAnonymousFunctions: Boolean(!formatSettings || formatSettings.insertSpaceAfterFunctionKeywordForAnonymousFunctions),
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: Boolean(formatSettings && formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis),
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: Boolean(formatSettings && formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets),
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: Boolean(formatSettings && formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces),
        InsertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: Boolean(formatSettings && formatSettings.insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces),
        PlaceOpenBraceOnNewLineForControlBlocks: Boolean(formatSettings && formatSettings.placeOpenBraceOnNewLineForFunctions),
        PlaceOpenBraceOnNewLineForFunctions: Boolean(formatSettings && formatSettings.placeOpenBraceOnNewLineForControlBlocks)
    };
}
function computeInitialIndent(document, range, options) {
    let lineStart = document.offsetAt(vscode_languageserver_types_1.Position.create(range.start.line, 0));
    let content = document.getText();
    let i = lineStart;
    let nChars = 0;
    let tabSize = options.tabSize || 4;
    while (i < content.length) {
        let ch = content.charAt(i);
        if (ch === ' ') {
            nChars++;
        }
        else if (ch === '\t') {
            nChars += tabSize;
        }
        else {
            break;
        }
        i++;
    }
    return Math.floor(nChars / tabSize);
}
function generateIndent(level, options) {
    if (options.insertSpaces) {
        return (0, strings_1.repeat)(' ', level * options.tabSize);
    }
    else {
        return (0, strings_1.repeat)('\t', level);
    }
}
//# sourceMappingURL=javascriptMode.js.map