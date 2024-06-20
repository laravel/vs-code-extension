import * as vscode from "vscode";
import { info } from "../support/logger";
import { projectPath, relativePath } from "../support/project";
import { trimQuotes } from "../support/util";

export const controller = vscode.tests.createTestController(
    "laravelTests",
    "Laravel Tests",
);

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

    items.add(file);

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

    for (let index in lines) {
        const match = lines[index].match(/^\s*(?:it|test)\(([^,)]+)/m);

        if (match) {
            const lineNumber = parseInt(index) + 1;

            const test = controller.createTestItem(
                `${file.uri}/${match[1]}`,
                trimQuotes(match[1]),
                file.uri?.with({ fragment: `L${lineNumber}` }),
            );

            file.children.add(test);
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

const runHandler = async (
    shouldDebug: boolean,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
) => {
    const run = controller.createTestRun(request);
    const queue: vscode.TestItem[] = [];

    // Loop through all included tests, or all known tests, and add them to our queue
    if (request.include) {
        request.include.forEach((test) => queue.push(test));
    } else {
        controller.items.forEach((test) => queue.push(test));
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
            const task = new vscode.Task(
                { type: "testrunner", task: "run" },
                vscode.TaskScope.Workspace,
                "run",
                "testrunner",
                new vscode.ShellExecution(
                    `/Users/joetannenbaum/Herd/blip/vendor/bin/pest ${test.uri?.fsPath} --filter '${test.label}'`,
                ),
                "$testrunner",
            );

            // vscode.tasks.onDidEndTaskProcess((e) => {
            //     let task = e.execution.task;
            //     if (task) {
            //         info(
            //             "Task finished: " +
            //                 task.name +
            //                 " " +
            //                 task.definition.type,
            //         );

            //         bigInfo("exit code", e.exitCode);
            //         // const definition: MyTaskDefinition = <any>task.definition;
            //         // // ensure this is the relevant task
            //         // if (definition.myRelevantProperty) {
            //         //     log.debug("The test task returned " + e.exitCode);
            //         // }
            //     }
            // });

            const result = await vscode.tasks.executeTask(task);

            info("hm", result.task.execution);

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
    "Run Laravel Ish",
    vscode.TestRunProfileKind.Run,
    (request, token) => {
        runHandler(false, request, token);
    },
    true,
);

const debugProfile = controller.createRunProfile(
    "Debug",
    vscode.TestRunProfileKind.Debug,
    (request, token) => {
        runHandler(true, request, token);
    },
    true,
);
