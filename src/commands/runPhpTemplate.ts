import * as vscode from "vscode";

import { type TemplateName, templates } from "@src/templates";
import { template, runInLaravel } from "@src/support/php";

export const runPhpTemplate = async () => {
    const selection = await vscode.window.showQuickPick(getChoices(), {
        placeHolder: "Select the PHP template to run.",
        canPickMany: false,
    });

    if (!selection) {
        return;
    }

    const output = await runInLaravel(
        template(selection.label as TemplateName),
    );

    console.log(output);
};

const getChoices = (): vscode.QuickPickItem[] => {
    return Object.keys(templates).map((label) => ({ label }));
};
