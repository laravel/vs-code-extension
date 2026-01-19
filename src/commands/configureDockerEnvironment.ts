import * as vscode from "vscode";
import { execSync } from "child_process";
import { config, updateConfig } from "@src/support/config";

interface DockerContainer {
    ID: string;
    Names: string;
    Image: string;
    State: string;
}

export const configureDockerEnvironment = async () => {
    let containers: DockerContainer[];

    try {
        const output = execSync("docker ps --format=json", {
            encoding: "utf-8",
        });

        containers = output
            .trim()
            .split("\n")
            .filter((line) => line)
            .map((line) => JSON.parse(line) as DockerContainer);
    } catch {
        vscode.window.showErrorMessage(
            "Failed to retrieve Docker containers. Make sure Docker is running.",
        );

        return;
    }

    if (containers.length === 0) {
        vscode.window.showErrorMessage("No running Docker containers found.");

        return;
    }

    const containerItems = containers.map((container) => ({
        label: container.Names,
        description: container.Image,
        detail: `ID: ${container.ID}`,
        container,
    }));

    const selectedContainer = await vscode.window.showQuickPick(
        containerItems,
        {
            placeHolder: "Select a Docker container",
            title: "Docker Container",
        },
    );

    if (!selectedContainer) {
        return;
    }

    const workingDirectory = await vscode.window.showInputBox({
        prompt: "Enter the working directory inside the Docker container",
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

    if (config<string | null>("phpCommand", null)) {
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
        ? `docker exec -w ${workingDirectory} ${selectedContainer.container.Names} php`
        : `docker exec ${selectedContainer.container.Names} php`;

    await updateConfig("phpEnvironment", "docker", scope.target);
    await updateConfig("phpCommand", phpCommand, scope.target);

    vscode.commands.executeCommand("workbench.action.reloadWindow");

    vscode.window.showInformationMessage(
        "Docker environment configured successfully.",
    );
};
