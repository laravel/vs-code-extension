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
                {
                    line: "    public function exampleJsonResponseMissing()",
                    argument: "exampleJsonResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleJsonResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleRedirectResponseMissing()",
                    argument: "exampleRedirectResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleRedirectResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleStreamedResponseMissing()",
                    argument: "exampleStreamedResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleStreamedResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleBinaryFileResponseMissing()",
                    argument: "exampleBinaryFileResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleBinaryFileResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleViewResponseMissing()",
                    argument: "exampleViewResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleViewResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleHttpResponseMissing()",
                    argument: "exampleHttpResponseMissing",
                    code: "returnType",
                    contains: [
                        "exampleHttpResponseMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleCollectionMissing()",
                    argument: "exampleCollectionMissing",
                    code: "returnType",
                    contains: [
                        "exampleCollectionMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleLengthAwarePaginatorMissing()",
                    argument: "exampleLengthAwarePaginatorMissing",
                    code: "returnType",
                    contains: [
                        "exampleLengthAwarePaginatorMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function examplePaginatorMissing()",
                    argument: "examplePaginatorMissing",
                    code: "returnType",
                    contains: [
                        "examplePaginatorMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleCursorPaginatorMissing()",
                    argument: "exampleCursorPaginatorMissing",
                    code: "returnType",
                    contains: [
                        "exampleCursorPaginatorMissing",
                        "missing a return type",
                    ],
                },
                {
                    line: "    public function exampleRouteStringMissing()",
                    argument: "exampleRouteStringMissing",
                    code: "returnType",
                    contains: [
                        "exampleRouteStringMissing",
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
            "exampleJsonResponse",
            "exampleRedirectResponse",
            "exampleStreamedResponse",
            "exampleBinaryFileResponse",
            "exampleViewResponse",
            "exampleHttpResponse",
            "exampleCollection",
            "exampleLengthAwarePaginator",
            "examplePaginator",
            "exampleCursorPaginator",
            "exampleRouteString",
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

        const jsonMethodOffset = text.indexOf("exampleJsonResponseMissing");
        const jsonMethodPosition = doc.positionAt(jsonMethodOffset);
        const jsonActions = await getCodeActions(
            doc,
            new vscode.Range(jsonMethodPosition, jsonMethodPosition),
        );
        const jsonTitles = jsonActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            jsonTitles.includes("Add return type ': JsonResponse'"),
            `Expected JsonResponse quick fix. Got: ${jsonTitles.join(", ")}`,
        );

        const redirectMethodOffset = text.indexOf("exampleRedirectResponseMissing");
        const redirectMethodPosition = doc.positionAt(redirectMethodOffset);
        const redirectActions = await getCodeActions(
            doc,
            new vscode.Range(redirectMethodPosition, redirectMethodPosition),
        );
        const redirectTitles = redirectActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            redirectTitles.includes("Add return type ': RedirectResponse'"),
            `Expected RedirectResponse quick fix. Got: ${redirectTitles.join(", ")}`,
        );

        const streamedMethodOffset = text.indexOf("exampleStreamedResponseMissing");
        const streamedMethodPosition = doc.positionAt(streamedMethodOffset);
        const streamedActions = await getCodeActions(
            doc,
            new vscode.Range(streamedMethodPosition, streamedMethodPosition),
        );
        const streamedTitles = streamedActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            streamedTitles.includes("Add return type ': StreamedResponse'"),
            `Expected StreamedResponse quick fix. Got: ${streamedTitles.join(", ")}`,
        );

        const binaryMethodOffset = text.indexOf(
            "exampleBinaryFileResponseMissing",
        );
        const binaryMethodPosition = doc.positionAt(binaryMethodOffset);
        const binaryActions = await getCodeActions(
            doc,
            new vscode.Range(binaryMethodPosition, binaryMethodPosition),
        );
        const binaryTitles = binaryActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            binaryTitles.includes("Add return type ': BinaryFileResponse'"),
            `Expected BinaryFileResponse quick fix. Got: ${binaryTitles.join(", ")}`,
        );

        const viewMethodOffset = text.indexOf("exampleViewResponseMissing");
        const viewMethodPosition = doc.positionAt(viewMethodOffset);
        const viewActions = await getCodeActions(
            doc,
            new vscode.Range(viewMethodPosition, viewMethodPosition),
        );
        const viewTitles = viewActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            viewTitles.includes("Add return type ': View'"),
            `Expected View quick fix. Got: ${viewTitles.join(", ")}`,
        );

        const httpMethodOffset = text.indexOf("exampleHttpResponseMissing");
        const httpMethodPosition = doc.positionAt(httpMethodOffset);
        const httpActions = await getCodeActions(
            doc,
            new vscode.Range(httpMethodPosition, httpMethodPosition),
        );
        const httpTitles = httpActions
            .map((action) => ("title" in action ? action.title : ""))
            .filter(Boolean);

        assert.ok(
            httpTitles.includes("Add return type ': Response'"),
            `Expected Response quick fix. Got: ${httpTitles.join(", ")}`,
        );

        const cases = [
            ["exampleCollectionMissing", "Collection"],
            ["exampleLengthAwarePaginatorMissing", "LengthAwarePaginator"],
            ["examplePaginatorMissing", "Paginator"],
            ["exampleCursorPaginatorMissing", "CursorPaginator"],
            ["exampleRouteStringMissing", "string"],
        ];

        for (const [methodName, expectedType] of cases) {
            const offset = text.indexOf(methodName);
            const position = doc.positionAt(offset);
            const caseActions = await getCodeActions(
                doc,
                new vscode.Range(position, position),
            );
            const caseTitles = caseActions
                .map((action) => ("title" in action ? action.title : ""))
                .filter(Boolean);

            assert.ok(
                caseTitles.includes(`Add return type ': ${expectedType}'`),
                `Expected ${expectedType} quick fix. Got: ${caseTitles.join(", ")}`,
            );
        }
    });
});
