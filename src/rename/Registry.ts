"use strict";

import * as vscode from "vscode";
import { RenameFilesProvider, RenameFilesRegistryProvider } from "..";

export class Registry implements RenameFilesRegistryProvider {
    private providers: RenameFilesProvider[] = [];

    constructor(...providers: RenameFilesProvider[]) {
        this.providers.push(...providers);
    }

    provideBeforeRenameFiles(event: vscode.FileWillRenameEvent): void {
        this.providers.forEach((provider) => {
            const files = provider.customCheck(event);

            if (files.length > 0) {
                provider.beforeRenameFiles(files);
            }
        });
    }

    provideAfterRenameFiles(event: vscode.FileRenameEvent): void {
        this.providers.forEach((provider) => {
            const files = provider.customCheck(event);

            if (files.length > 0) {
                provider.afterRenameFiles(files);
            }
        });
    }
}
