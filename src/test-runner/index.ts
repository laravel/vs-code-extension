import { config } from "@src/support/config";
import * as vscode from "vscode";
import DockerPhpUnitCommand from "./docker-phpunit-command";
import PhpUnitCommand from "./phpunit-command";
import RemotePhpUnitCommand from "./remote-phpunit-command";

type Command = PhpUnitCommand | RemotePhpUnitCommand | DockerPhpUnitCommand;

let globalCommand: Command;

async function runCommand(command: Command) {
    setGlobalCommandInstance(command);

    vscode.window.activeTextEditor ||
        vscode.window.showErrorMessage(
            "Better PHPUnit: open a file to run this command",
        );

    await vscode.commands.executeCommand("workbench.action.terminal.clear");
    await vscode.commands.executeCommand(
        "workbench.action.tasks.runTask",
        "phpunit: run",
    );
}

async function runPreviousCommand() {
    await vscode.commands.executeCommand("workbench.action.terminal.clear");
    await vscode.commands.executeCommand(
        "workbench.action.tasks.runTask",
        "phpunit: run",
    );
}

const setGlobalCommandInstance = (commandInstance: Command) => {
    // Store this object globally for the provideTasks, "run-test-previous", and for tests to assert against.
    globalCommand = commandInstance;
};

const resolveTestRunnerCommand = (options = {}): Command => {
    if (config<boolean>("tests.docker.enabled", false)) {
        return new DockerPhpUnitCommand(options);
    }

    if (config<boolean>("tests.ssh.enabled", false)) {
        return new RemotePhpUnitCommand(options);
    }

    return new PhpUnitCommand(options);
};

export const testRunnerCommands = [
    vscode.commands.registerCommand("laravel.run-test", async () => {
        await runCommand(resolveTestRunnerCommand());
    }),

    vscode.commands.registerCommand("laravel.run-test-file", async () => {
        await runCommand(resolveTestRunnerCommand({ runFile: true }));
    }),

    vscode.commands.registerCommand("laravel.run-test-suite", async () => {
        await runCommand(resolveTestRunnerCommand({ runFullSuite: true }));
    }),

    vscode.commands.registerCommand("laravel.run-test-previous", async () => {
        await runPreviousCommand();
    }),

    vscode.tasks.registerTaskProvider("phpunit", {
        provideTasks: () => {
            if (!globalCommand) {
                return [];
            }

            return [
                new vscode.Task(
                    { type: "phpunit", task: "run" },
                    vscode.TaskScope.Workspace,
                    "run",
                    "phpunit",
                    new vscode.ShellExecution(globalCommand.output),
                    "$phpunit",
                ),
            ];
        },
        resolveTask: function (
            task: vscode.Task,
            token: vscode.CancellationToken,
        ): vscode.ProviderResult<vscode.Task> {
            throw new Error("Function not implemented.");
        },
    }),
];
