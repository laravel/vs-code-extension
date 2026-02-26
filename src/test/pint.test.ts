import * as assert from "assert";
import * as vscode from "vscode";
import { activateExtension, uri } from "./helper";

const UNFORMATTED = `<?php
class PintCommandTemp{public function run( ){return 1;}}
`;

const EXPECTED = `<?php

class PintCommandTemp
{
    public function run()
    {
        return 1;
    }
}
`;

suite("Pint Test Suite", () => {
    const tempFileUri = uri("app/PintCommandTemp.php");

    suiteSetup(async () => {
        await activateExtension();
    });

    teardown(async () => {
        await vscode.workspace.fs.delete(tempFileUri, { useTrash: false });
    });

    test("formats current file via Pint command", async () => {
        const encoder = new TextEncoder();

        await vscode.workspace.fs.writeFile(
            tempFileUri,
            encoder.encode(UNFORMATTED),
        );

        const doc = await vscode.workspace.openTextDocument(tempFileUri);
        await vscode.window.showTextDocument(doc, { preview: false });

        await vscode.commands.executeCommand("laravel.pint.runOnCurrentFile");

        const bytes = await vscode.workspace.fs.readFile(tempFileUri);
        const formatted = Buffer.from(bytes).toString("utf8");

        const normalize = (value: string) => value.replace(/\r\n/g, "\n");

        assert.notStrictEqual(
            formatted,
            UNFORMATTED,
            "Expected Pint to modify file contents",
        );
        assert.strictEqual(normalize(formatted), normalize(EXPECTED));
    });
});
