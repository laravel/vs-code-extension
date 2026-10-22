import * as vscode from "vscode";
import { execFileSync } from "child_process";
import { config, updateConfig } from "@src/support/config";

interface PodmanContainer {
    Id: string;
    Names: string[];
    Image: string;
}

export const configurePodmanEnvironment = async () => {
    let containers: PodmanContainer[];

    try {
        const output = execFileSync("podman", ["ps", "--format=json"], {
            encoding: "utf-8",
        });

        containers = JSON.parse(output) as PodmanContainer[];
    } catch {
        vscode.window.showErrorMessage(
            "Failed to retrieve Podman containers. Make sure Podman is running.",
        );

        return;
    }

    if (containers.length === 0) {
        vscode.window.showErrorMessage("No running Podman containers found.");

        return;
    }

    const containerItems = containers.map((container) => ({
        label: container.Names[0] ?? container.Id,
        description: container.Image,
        detail: `ID: ${container.Id}`,
        container,
    }));

    const selectedContainer = await vscode.window.showQuickPick(
        containerItems,
        {
            placeHolder: "Select a Podman container",
            title: "Podman Container",
        },
    );

    if (!selectedContainer) {
        return;
    }

    const workingDirectory = await vscode.window.showInputBox({
        prompt: "Enter the working directory inside the Podman container",
        value: "/var/www/html",
        title: "Working Directory",
    });

    if (workingDirectory === undefined) {
        return;
    }

    const scope = await vscode.window.showQuickPick(
        [
            {
                label: "Workspace",
                target: vscode.ConfigurationTarget.Workspace,
            },
            {
                label: "Global",
                target: vscode.ConfigurationTarget.Global,
            },
        ],
        {
            placeHolder: "Apply configuration to workspace or globally?",
            title: "Configuration Scope",
        },
    );

    if (!scope) {
        return;
    }

    if (hasExistingPhpCommandConfig()) {
        const override = await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder:
                "A Laravel PHP command is already configured. Do you want to override it?",
            title: "Override PHP Command",
        });

        if (override !== "Yes") {
            return;
        }
    }

    const phpCommand = workingDirectory
        ? [
              "podman",
              "exec",
              "-w",
              workingDirectory,
              selectedContainer.container.Names[0] ?? selectedContainer.container.Id,
              "php",
          ]
        : [
              "podman",
              "exec",
              selectedContainer.container.Names[0] ?? selectedContainer.container.Id,
              "php",
          ];

    await updateConfig("phpEnvironment", "podman", scope.target);
    await updateConfig("phpCommand", phpCommand, scope.target);

    vscode.commands.executeCommand("workbench.action.reloadWindow");

    vscode.window.showInformationMessage(
        "Podman environment configured successfully.",
    );
};

const hasExistingPhpCommandConfig = (): boolean => {
    const configuredPhpCommand = config<unknown>("phpCommand", []);

    return (
        Array.isArray(configuredPhpCommand) && configuredPhpCommand.length > 0
    );
};
