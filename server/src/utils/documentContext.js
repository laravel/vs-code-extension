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
exports.getDocumentContext = void 0;
const strings_1 = require("../utils/strings");
const url = __importStar(require("url"));
function getDocumentContext(documentUri, workspaceFolders) {
    function getRootFolder() {
        for (let folder of workspaceFolders) {
            let folderURI = folder.uri;
            if (!(0, strings_1.endsWith)(folderURI, '/')) {
                folderURI = folderURI + '/';
            }
            if ((0, strings_1.startsWith)(documentUri, folderURI)) {
                return folderURI;
            }
        }
        return void 0;
    }
    return {
        resolveReference: (ref, base = documentUri) => {
            if (ref[0] === '/') { // resolve absolute path against the current workspace folder
                if ((0, strings_1.startsWith)(base, 'file://')) {
                    let folderUri = getRootFolder();
                    if (folderUri) {
                        return folderUri + ref.substr(1);
                    }
                }
            }
            return url.resolve(base, ref);
        },
    };
}
exports.getDocumentContext = getDocumentContext;
//# sourceMappingURL=documentContext.js.map