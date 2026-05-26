import * as assert from "assert";
import * as vscode from "vscode";
import { assertDiagnostics } from "./assertions";
import { activateExtension, getCodeActions, getDiagnostics, uri } from "./helper";

suite("Return Type Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides return type diagnostics only when missing", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("app/return-type-helper.php"),
        );

        await assertDiagnostics({
            doc,
            lines: [
                {
                    line: "    public function exmpleWithoutType()",
                    argument: "exmpleWithoutType",
                    code: "returnType",
                    contains: ["exmpleWithoutType", "missing a return type"],
                },
                {
                    line: "    public function exampleAnotherMissing()",
                    argument: "exampleAnotherMissing",
                    code: "returnType",
                    contains: [
                        "exampleAnotherMissing",
                        "missing a return type",
                    ],
                },
            ],
        });

        const diagnostics = await getDiagnostics(doc);
        const text = doc.getText();
        const typedMethods = [
            "__construct",
            "exmple",
            "exampleInt",
            "exampleString",
            "exampleUnion",
            "exampleMixed",
            "exampleNullable",
            "exampleIntersection",
            "exampleModel",
        ];

        for (const methodName of typedMethods) {
            const methodOffset = text.indexOf(`function ${methodName}`) + 9;
            const typedMethodDiagnostic = diagnostics.find((diagnostic) => {
                return (
                    methodOffset >= doc.offsetAt(diagnostic.range.start) &&
                    methodOffset < doc.offsetAt(diagnostic.range.end)
                );
            });

            assert.strictEqual(
                typedMethodDiagnostic,
                undefined,
                `Did not expect a diagnostic for ${methodName} because it already has a return type`,
            );
        }
    });

    test("provides quick fixes for missing return types", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("app/return-type-helper.php"),
        );
        const text = doc.getText();
        const methodOffset = text.indexOf("exmpleWithoutType");
        const position = doc.positionAt(methodOffset);
        const actions = await getCodeActions(
            doc,
            new vscode.Range(position, position),
        );
        const titles = actions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            titles.includes("Add return type ': array'"),
            `Expected inferred return type quick fix. Got: ${titles.join(", ")}`,
        );
        assert.ok(
            titles.includes("Add return type ': mixed'"),
            `Expected fallback return type quick fix. Got: ${titles.join(", ")}`,
        );
    });
});
