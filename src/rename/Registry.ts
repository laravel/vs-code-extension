"use strict";

import * as vscode from "vscode";
import { RenameFilesProvider, RenameFilesRegistryProvider } from "..";

export class Registry implements RenameFilesRegistryProvider {
    private providers: RenameFilesProvider[] = [];

    constructor(...providers: RenameFilesProvider[]) {
        this.providers.push(...providers);
    }

    provideRenameFiles(event: vscode.FileRenameEvent): void {
        this.providers.forEach((provider) => {
            const files = provider.customCheck(event);

            if (files.length > 0) {
                provider.provideRenameFiles(files);
            }
        });
    }
}
