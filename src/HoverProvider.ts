"use strict";

import {
    HoverProvider as vsHoverProvider,
    TextDocument,
    Position,
    ProviderResult,
    Hover,
    workspace,
    MarkdownString,
} from "vscode";
import Logger from "./Logger";

export default class HoverProvider implements vsHoverProvider {
    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        // let reg = new RegExp(config.regex);
        // let linkRange = doc.getWordRangeAtPosition(pos, reg);
        // Logger.info("linkRange:", linkRange);
        // if (!linkRange) {
        //     return null;
        // }
        // let filePaths = util.getFilePaths(doc.getText(linkRange), doc);
        // if (filePaths.length === 0) {
        //     return null;
        // }
        // let workspaceFolder = workspace.getWorkspaceFolder(doc.uri);
        // let text = "";
        // for (let i in filePaths) {
        //     text += ` [${workspaceFolder?.name + filePaths[i].showPath}](${
        //         filePaths[i].fileUri
        //     })  \r`;
        // }
        // return new Hover(new MarkdownString(text));

        return null;
    }
}
