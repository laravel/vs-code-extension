import * as assert from "assert";
import fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { assertHovers, assertLinks } from "./assertions";
import {
    activateExtension,
    getCompletions,
    getLinks,
    sleep,
    uri,
} from "./helper";

suite("Blade Component Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides blade component completions", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("resources/views/blade-component-helper.blade.php"),
        );

        const index = doc.getText().indexOf("<x-");

        if (index === -1) {
            assert.fail("Could not find blade component completion marker");
        }

        const completions = await getCompletions(
            doc,
            doc.positionAt(index + 3),
        );
        const names = completions.items.map((item) =>
            typeof item.label === "string" ? item.label : item.label.label,
        );

        assert.ok(
            names.includes("x-test-alert"),
            `Should suggest 'x-test-alert'. Got: ${names.join(", ")}`,
        );
    });

    test("provides blade component links", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("resources/views/blade-component-helper.blade.php"),
            ),
            lines: [
                {
                    line: "<x-test-alert>",
                    argument: "test-alert",
                    target: "resources/views/components/test-alert.blade.php",
                },
            ],
        });
    });

    test("provides blade component hovers", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("resources/views/blade-component-helper.blade.php"),
            ),
            lines: [
                {
                    line: "<x-test-alert>",
                    argument: "test-alert",
                    contains: [
                        "resources/views/components/test-alert.blade.php",
                    ],
                },
            ],
        });
    });

    suite("auto refactor blade component namespaces", () => {
        const files = {
            component: uri(
                "resources/views/components/rename-source.blade.php",
            ),
            classComponent: uri("app/View/Components/RenameSource.php"),
            consumer: uri(
                "resources/views/components/rename-consumer.blade.php",
            ),
            movedComponent: uri(
                "resources/views/components/testing/rename-source.blade.php",
            ),
            movedClassComponent: uri(
                "app/View/Components/Testing/RenameSource.php",
            ),
        };

        const waitForComponentToContain = async (
            uri: vscode.Uri,
            expected: string,
            retryUntil = 5000,
        ) => {
            const start = Date.now();
            let text = await fs.readFile(uri.fsPath, "utf-8");

            while (
                !text.includes(expected) &&
                Date.now() - start < retryUntil
            ) {
                await sleep(100);

                text = await fs.readFile(uri.fsPath, "utf-8");
            }

            return text;
        };

        const waitForComponentToExist = async (
            uri: vscode.Uri,
            retryUntil = 5000,
        ) => {
            const start = Date.now();

            while (Date.now() - start < retryUntil) {
                try {
                    await fs.access(uri.fsPath);

                    return;
                } catch {
                    await sleep(100);
                }
            }

            assert.fail(`Expected file to exist: ${uri.fsPath}`);
        };

        const waitForComponentToBeIndexed = async (
            uri: vscode.Uri,
            key: string,
            retryUntil = 5000,
        ) => {
            const doc = await vscode.workspace.openTextDocument(uri);
            const start = Date.now();
            const expectedTarget = [
                "resources/views/components/",
                key.replace(/^x-/, "").replaceAll(".", "/"),
                ".blade.php",
            ].join("");

            while (Date.now() - start < retryUntil) {
                const links = await getLinks(doc);
                const hasExpectedLink = links.some((link) =>
                    link.target?.fsPath
                        ?.replaceAll("\\", "/")
                        .endsWith(expectedTarget),
                );

                if (hasExpectedLink) {
                    return;
                }

                await sleep(100);
            }

            assert.fail(
                `Component '${key}' was not linked in time by Blade components repository`,
            );
        };

        const deleteIfExist = async (target: vscode.Uri) =>
            fs.rm(target.fsPath, {
                force: true,
            });

        setup(async () => {
            await Promise.all(
                Object.values(files).map((file) => deleteIfExist(file)),
            );
        });

        teardown(async () => {
            await Promise.all(
                Object.values(files).map((file) => deleteIfExist(file)),
            );
        });

        const componentNamespaceCases = [
            {
                name: "self-closing component tag",
                key: "x-rename-source",
                source: "<x-rename-source />",
                expected: "<x-testing.rename-source />",
            },
            {
                name: "paired component tag",
                key: "x-rename-source",
                source: "<x-rename-source></x-rename-source>",
                expected: "<x-testing.rename-source></x-testing.rename-source>",
            },
        ];

        for (const componentNamespaceCase of componentNamespaceCases) {
            test(`updates blade component namespace after moving component file (${componentNamespaceCase.name})`, async () => {
                await fs.writeFile(
                    files.component.fsPath,
                    "<div>Component</div>",
                );

                await fs.writeFile(
                    files.consumer.fsPath,
                    componentNamespaceCase.source,
                );

                await waitForComponentToBeIndexed(
                    files.consumer,
                    componentNamespaceCase.key,
                );

                const edit = new vscode.WorkspaceEdit();

                edit.renameFile(files.component, files.movedComponent, {
                    overwrite: true,
                });

                const applied = await vscode.workspace.applyEdit(edit);

                assert.ok(
                    applied,
                    "Expected rename WorkspaceEdit to be applied",
                );

                const text = await waitForComponentToContain(
                    files.consumer,
                    componentNamespaceCase.expected,
                );

                assert.ok(
                    text.includes(componentNamespaceCase.expected),
                    `Expected consumer file to contain '${componentNamespaceCase.expected}', got: ${text}`,
                );
            });
        }

        test(`updates blade component namespace after moving class component file`, async () => {
            await fs.writeFile(files.component.fsPath, "<div>Component</div>");

            await fs.mkdir(path.dirname(files.classComponent.fsPath), {
                recursive: true,
            });

            await fs.writeFile(
                files.classComponent.fsPath,
                `<?php

                namespace App\\View\\Components;

                use Illuminate\\Contracts\\View\\View;
                use Illuminate\\View\\Component;

                class RenameSource extends Component
                {
                    public function render(): View
                    {
                        return view('components.rename-source');
                    }
                }`,
            );

            await fs.writeFile(files.consumer.fsPath, "<x-rename-source />");

            await waitForComponentToBeIndexed(
                files.consumer,
                "x-rename-source",
            );

            const edit = new vscode.WorkspaceEdit();

            edit.renameFile(files.classComponent, files.movedClassComponent, {
                overwrite: true,
            });

            const applied = await vscode.workspace.applyEdit(edit);

            assert.ok(applied, "Expected rename WorkspaceEdit to be applied");

            await waitForComponentToExist(files.movedComponent);

            const hasOldComponent = await fs
                .access(files.component.fsPath)
                .then(() => true)
                .catch(() => false);

            assert.ok(
                !hasOldComponent,
                `Expected old component file to be moved from '${files.component.fsPath}'`,
            );

            const classContent = await waitForComponentToContain(
                files.movedClassComponent,
                "return view('components.testing.rename-source');",
            );

            assert.ok(
                classContent.includes(
                    "return view('components.testing.rename-source');",
                ),
                `Expected class component render view to be updated, got: ${classContent}`,
            );
        });
    });
});
