import { spawn } from "child_process";
import * as vscode from "vscode";
import { info } from "../support/logger";
import { projectPath, relativePath } from "../support/project";
import { trimQuotes } from "../support/util";

export const controller = vscode.tests.createTestController(
    "laravelTests",
    "Laravel Tests",
);

type TestRunner = "pest" | "phpunit";

interface TestData {
    type: "directory" | "file" | "test";
    testRunner?: TestRunner;
}

const testData = new WeakMap<vscode.TestItem, TestData>();

// First, create the `resolveHandler`. This may initially be called with
// "undefined" to ask for all tests in the workspace to be discovered, usually
// when the user opens the Test Explorer for the first time.
controller.resolveHandler = async (test) => {
    if (!test) {
        await discoverAllFilesInWorkspace();
    } else {
        await parseTestsInFileContents(test);
    }
};

// When text documents are open, parse tests in them.
vscode.workspace.onDidOpenTextDocument((e) => {
    parseTestsInDocument(e);
});
// We could also listen to document changes to re-parse unsaved changes:
vscode.workspace.onDidChangeTextDocument((e) =>
    parseTestsInDocument(e.document),
);

// In this function, we'll get the file TestItem if we've already found it,
// otherwise we'll create it with `canResolveChildren = true` to indicate it
// can be passed to the `controller.resolveHandler` to gets its children.
function getOrCreateFile(uri: vscode.Uri) {
    const relPath = relativePath(uri.fsPath);
    const parts = relPath.split("/");
    const filename = parts.pop();

    let items = controller.items;

    parts.forEach((part, index) => {
        const currentPath = projectPath(parts.slice(0, index + 1).join("/"));

        if (items.get(currentPath)) {
            items = items.get(currentPath)!.children;
            return;
        }

        const item = controller.createTestItem(
            currentPath,
            part,
            vscode.Uri.file(currentPath),
        );

        item.canResolveChildren = true;

        items.add(item);

        testData.set(item, { type: "directory" });

        items = item.children;
    });

    const existing = items.get(uri.toString());

    if (existing) {
        return existing;
    }

    const file = controller.createTestItem(
        uri.toString(),
        filename!.replace("Test.php", ""),
        uri,
    );

    file.canResolveChildren = true;

    // TODO: If it's a PHPUnit test, put it at the class declaration
    file.range = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0),
    );

    items.add(file);

    testData.set(file, { type: "file" });

    return file;
}

function parseTestsInDocument(e: vscode.TextDocument) {
    if (e.uri.scheme === "file" && e.uri.path.endsWith("Test.php")) {
        parseTestsInFileContents(getOrCreateFile(e.uri), e.getText());
    }
}

async function parseTestsInFileContents(
    file: vscode.TestItem,
    contents?: string,
) {
    // If a document is open, VS Code already knows its contents. If this is being
    // called from the resolveHandler when a document isn't open, we'll need to
    // read them from disk ourselves.
    if (contents === undefined && file.uri) {
        const rawContent = await vscode.workspace.fs.readFile(file.uri);
        contents = new TextDecoder().decode(rawContent);
    }

    contents = contents || "";

    const lines = contents.split("\n");

    // clear out any existing children
    file.children.forEach((child) => {
        file.children.delete(child.id);
    });

    const regexes: {
        testRunner: TestRunner;
        regex: RegExp;
    }[] = [
        {
            testRunner: "pest",
            regex: /^\s*(?:it|test)\(([^,)]+)/m,
        },
        {
            testRunner: "phpunit",
            regex: /^\s*(?:public|private|protected)?\s*function\s*(\w+)\s*\(.*$/,
        },
    ];

    for (let index in lines) {
        for (let { regex, testRunner } of regexes) {
            const match = lines[index].match(regex);

            if (match) {
                const lineNumber = parseInt(index) + 1;

                const test = controller.createTestItem(
                    `${file.uri}/${match[1]}`,
                    testRunner === "pest" ? trimQuotes(match[1]) : match[1],
                    file.uri,
                );

                test.range = new vscode.Range(
                    new vscode.Position(lineNumber - 1, 0),
                    new vscode.Position(lineNumber - 1, 0),
                );

                file.children.add(test);

                testData.set(test, {
                    type: "test",
                    testRunner,
                });
            }
        }
    }
}

async function discoverAllFilesInWorkspace() {
    if (!vscode.workspace.workspaceFolders) {
        return []; // handle the case of no open folders
    }

    return Promise.all(
        vscode.workspace.workspaceFolders.map(async (workspaceFolder) => {
            const pattern = new vscode.RelativePattern(
                workspaceFolder,
                "**/*Test.php",
            );

            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            // When files are created, make sure there's a corresponding "file" node in the tree
            watcher.onDidCreate((uri) => getOrCreateFile(uri));
            // When files change, re-parse them. Note that you could optimize this so
            // that you only re-parse children that have been resolved in the past.
            watcher.onDidChange((uri) =>
                parseTestsInFileContents(getOrCreateFile(uri)),
            );
            // And, finally, delete TestItems for removed files. This is simple, since
            // we use the URI as the TestItem's ID.
            watcher.onDidDelete((uri) =>
                controller.items.delete(uri.toString()),
            );

            for (const file of await vscode.workspace.findFiles(
                pattern,
                new vscode.RelativePattern(workspaceFolder, "vendor/*"),
            )) {
                getOrCreateFile(file);
            }

            return watcher;
        }),
    );
}

const findTests = (item: vscode.TestItem) => {
    const tests: vscode.TestItem[] = [];

    if (item.children.size === 0) {
        tests.push(item);
    } else {
        item.children.forEach((child) => {
            tests.push(...findTests(child));
        });
    }

    return tests;
};

// const processLine = (line: string, command: Command) => {
const processLine = (line: string) => {
    info("processing line", line);
    // if (line.includes("FAIL")) {
    //     info("test failed", line);
    //     throw new Error("Test failed");
    // }
    // const result = problemMatcher.parse(line);

    // if (result) {
    //     const mappingResult = command.mapping(result);
    //     if ("kind" in result) {
    //         this.trigger(result.kind, mappingResult);
    //     }

    //     this.trigger(TestRunnerEvent.result, mappingResult);
    // }

    // this.trigger(TestRunnerEvent.line, line);
};

const runTest = async (test: vscode.TestItem) => {
    return new Promise<void>((resolve, reject) => {
        // TODO: Make this dynamic based on the test
        const binary = "pest"; //data?.testRunner || "phpunit";

        let args = [test.uri?.fsPath!];

        // if (data?.type === "test") {
        args.push("--filter");
        args.push(test.label);
        // }

        info("running test", projectPath(`vendor/bin/${binary}`), args);

        const proc = spawn(projectPath(`vendor/bin/${binary}`), args);

        // const proc = spawn(
        //     `${projectPath(`vendor/bin/${binary}`)} ${
        //         test.uri?.fsPath
        //     } ${args}`,
        // );

        let temp = "";
        let output = "";

        const processOutput = (data: string) => {
            const out = data.toString();
            info("process output", out);
            output += out;
            temp += out;
            const lines = temp.split(/\r\n|\n/);
            while (lines.length > 1) {
                processLine(lines.shift()!);
                // this.processLine(lines.shift()!, command);
            }
            temp = lines.shift()!;
        };

        proc.stdout!.on("data", processOutput);
        proc.stderr!.on("data", processOutput);
        proc.stdout!.on("end", () => processLine(temp));

        proc.on("error", (err: Error) => {
            const error = err.stack ?? err.message;
            info("process error", error);
            // this.trigger(TestRunnerEvent.error, error);
            // this.trigger(TestRunnerEvent.close, 2);
            reject("unfortunately, the test runner has failed");
        });

        proc.on("close", (code) => {
            info("process closed", code);
            // const eventName = this.isTestRunning(output)
            //     ? TestRunnerEvent.output
            //     : TestRunnerEvent.error;
            // this.trigger(eventName, output);
            // this.trigger(TestRunnerEvent.close, code);
            resolve();
        });
    });
};

const runHandler = async (
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
) => {
    const run = controller.createTestRun(request);
    const queue: vscode.TestItem[] = [];

    // Loop through all included tests, or all known tests, and add them to our queue
    if (request.include) {
        request.include.map((test) => queue.push(...findTests(test)));
    } else {
        controller.items.forEach((test) => queue.push(...findTests(test)));
    }

    // For every test that was queued, try to run it. Call run.passed() or run.failed().
    // The `TestMessage` can contain extra information, like a failing location or
    // a diff output. But here we'll just give it a textual message.
    while (queue.length > 0 && !token.isCancellationRequested) {
        const test = queue.pop()!;

        // Skip tests the user asked to exclude
        if (request.exclude?.includes(test)) {
            continue;
        }

        const start = Date.now();

        try {
            const data = testData.get(test);

            await runTest(test);

            run.passed(test, Date.now() - start);
        } catch (e: any) {
            run.failed(
                test,
                new vscode.TestMessage(e.message),
                Date.now() - start,
            );
        }

        // switch (getType(test)) {
        //     case ItemType.File:
        //         // If we're running a file and don't know what it contains yet, parse it now
        //         if (test.children.size === 0) {
        //             await parseTestsInFileContents(test);
        //         }
        //         break;
        //     case ItemType.TestCase:
        //         // Otherwise, just run the test case. Note that we don't need to manually
        //         // set the state of parent tests; they'll be set automatically.
        //         const start = Date.now();
        //         try {
        //             await assertTestPasses(test);
        //             run.passed(test, Date.now() - start);
        //         } catch (e) {
        //             run.failed(
        //                 test,
        //                 new vscode.TestMessage(e.message),
        //                 Date.now() - start,
        //             );
        //         }
        //         break;
        // }

        test.children.forEach((test) => queue.push(test));
    }

    // Make sure to end the run after all tests have been executed:
    run.end();
};

const runProfile = controller.createRunProfile(
    "Run Tests",
    vscode.TestRunProfileKind.Run,
    (request, token) => {
        runHandler(request, token);
    },
    true,
);
