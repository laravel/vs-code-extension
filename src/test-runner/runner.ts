import * as vscode from "vscode";
import { spawn } from "child_process";

import { projectPath } from "@src/support/project";
import { getCommand } from "@src/support/php";
import { parseLine, buildErrorMessage, TeamcityEvent } from "./teamcity";

export const runHandler = async (
    controller: vscode.TestController,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
) => {
    const run = controller.createTestRun(request);

    if (!request.include) {
        const testMap = buildTestMapFromController(controller);
        testMap.forEach((test) => run.enqueued(test));
        await executeTests([], testMap, run, token);
    } else {
        for (const item of request.include) {
            if (token.isCancellationRequested) break;
            if (request.exclude?.includes(item)) continue;

            const testMap = buildTestMap(item, request.exclude);
            testMap.forEach((test) => run.enqueued(test));
            await executeTests(buildCommandArgs(item), testMap, run, token);
        }
    }

    run.end();
};

type ItemType = "suite" | "directory" | "file" | "test";

const getItemType = (item: vscode.TestItem): ItemType => {
    if (item.id.startsWith("suite:")) return "suite";
    if (item.id.startsWith("dir:")) return "directory";
    if (item.id.startsWith("file:")) return "file";
    return "test";
};

const buildCommandArgs = (item: vscode.TestItem): string[] => {
    const type = getItemType(item);

    switch (type) {
        case "suite":
            return [`--testsuite="${item.id.slice(6)}"`];
        case "directory":
            return [item.id.slice(4)];
        case "file":
            return [item.id.slice(5)];
        case "test":
            const match = item.id.match(/^test:(.+?):.+$/);
            return match ? [match[1], `--filter="${item.label}"`] : [];
    }
};

const getEventName = (item: vscode.TestItem): string | null => {
    return item.id.match(/^test:.+?:(.+)$/)?.[1] || null;
};

const buildTestMap = (
    item: vscode.TestItem,
    exclude?: readonly vscode.TestItem[],
): Map<string, vscode.TestItem> => {
    const map = new Map<string, vscode.TestItem>();

    const collect = (current: vscode.TestItem) => {
        if (exclude?.includes(current)) return;

        if (current.children.size === 0) {
            const eventName = getEventName(current);
            if (eventName) {
                map.set(eventName, current);
            }
        } else {
            current.children.forEach((child) => collect(child));
        }
    };

    collect(item);

    return map;
};

const buildTestMapFromController = (
    controller: vscode.TestController,
): Map<string, vscode.TestItem> => {
    const map = new Map<string, vscode.TestItem>();

    controller.items.forEach((item) => {
        buildTestMap(item).forEach((test, name) => map.set(name, test));
    });

    return map;
};

const isPhpDebugEnabled = (): boolean =>
    vscode.debug.activeDebugSession?.type === "php";

const getProcessEnv = (): NodeJS.ProcessEnv => ({
    ...(isPhpDebugEnabled() ? { XDEBUG_TRIGGER: "1" } : {}),
    ...process.env,
});

const executeTests = async (
    args: string[],
    testMap: Map<string, vscode.TestItem>,
    run: vscode.TestRun,
    token: vscode.CancellationToken,
): Promise<void> => {
    return new Promise((resolve) => {
        const proc = spawn(
            getCommand("artisan"),
            ["test", ...args, "--colors=always", "--log-teamcity=php://stdout"],
            {
                cwd: projectPath(),
                shell: true,
                detached: true,
                env: getProcessEnv(),
            },
        );

        const subscription = token.onCancellationRequested(() => {
            killProcessTree(proc.pid);
        });

        let buffer = "";

        const processData = (data: Buffer) => {
            buffer += data.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const event = parseLine(line);

                if (event) {
                    handleEvent(event, testMap, run);
                } else if (line.trim()) {
                    run.appendOutput(line + "\r\n");
                }
            }
        };

        proc.stdout.on("data", processData);
        proc.stderr.on("data", processData);

        proc.on("error", () => {
            subscription.dispose();
            testMap.forEach((test) => {
                run.failed(test, new vscode.TestMessage("Failed to run test."));
            });
            resolve();
        });

        proc.on("close", () => {
            subscription.dispose();
            if (token.isCancellationRequested) {
                testMap.forEach((test) => run.skipped(test));
            }
            resolve();
        });
    });
};

const handleEvent = (
    event: TeamcityEvent,
    testMap: Map<string, vscode.TestItem>,
    run: vscode.TestRun,
) => {
    const test = testMap.get(event.attributes.name);

    if (!test) return;

    switch (event.type) {
        case "testStarted":
            run.started(test);
            break;

        case "testFinished":
            run.passed(test, parseInt(event.attributes.duration, 10) || 0);
            testMap.delete(event.attributes.name);
            break;

        case "testFailed":
            run.failed(
                test,
                buildErrorMessage(event),
                parseInt(event.attributes.duration, 10) || 0,
            );
            testMap.delete(event.attributes.name);
            break;

        case "testIgnored":
            run.skipped(test);
            testMap.delete(event.attributes.name);
            break;
    }
};

const killProcessTree = (pid?: number) => {
    if (!pid) {
        return;
    }

    if (process.platform === "win32") {
        spawn("taskkill", ["/PID", pid.toString(), "/T", "/F"]);
        return;
    }

    try {
        process.kill(-pid, "SIGTERM");
    } catch {
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            // Ignore if already exited.
        }
    }
};
