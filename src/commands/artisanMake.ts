import { artisan } from "@src/support/php";
import path from "path";
import * as vscode from "vscode";
import { getNamespace, NamespaceNotFoundError } from "./generateNamespace";

interface Argument {
    name: string;
    type?: ArgumentType | undefined;
    description?: string;
}

interface Option {
    name: string;
    callback?: () => Record<string, string>;
    description?: string;
}

interface Command {
    name: SubCommand;
    arguments: Argument[];
    options?: Option[];
}

enum ArgumentType {
    Namespace = "namespace",
}

enum EndSelection {
    Name = "End Selection",
    Value = "end-selection",
}

type SubCommand = "controller";

export const commands: Command[] = [
    {
        name: "controller",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the controller",
            },
        ],
        options: [
            {
                name: "--api",
                description:
                    "Exclude the create and edit methods from the controller",
            },
            {
                name: "--invokable",
                description:
                    "Generate a single method, invokable controller class",
            },
        ],
    },
];

const getValueForArgumentType = async (
    value: string,
    argumentType: ArgumentType | undefined,
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
): Promise<string> => {
    switch (argumentType) {
        case ArgumentType.Namespace:
            // User can input a relative path, for example: NewFolder\NewFile 
            // or NewFolder/NewFile, so we need to convert it to a new Uri
            const newUri = vscode.Uri.joinPath(uri, value);
            const fileName = path.parse(newUri.fsPath).name;

            const namespace = await getNamespace(workspaceFolder, newUri);

            return (`${namespace}\\${fileName}`)
                .replace(/\//g, "\\")
                .replace(/(?<!\\)\\(?!\\)/g, "\\\\");
        default:
            return value;
    }
};

export const artisanMakeCommandNameSubCommandName = (command: SubCommand) =>
    `laravel.artisan.make.${command}`;

export const artisanMakeCommand = async (command: Command, uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot detect active workspace");

        return;
    }

    const userArguments: Record<string, string> = {};

    for (const argument of command.arguments) {
        let input = undefined;

        while (!input) {
            input = await vscode.window.showInputBox({
                prompt: argument.description,
            });

            // Exit when the user press ESC
            if (input === undefined) {
                return;
            }

            if (input === "") {
                vscode.window.showWarningMessage(
                    `Argument ${argument.name} is required`,
                );
            }
        }

        try {
            userArguments[argument.name] = await getValueForArgumentType(
                input,
                argument.type,
                workspaceFolder,
                uri,
            );
        } catch (error) {
            if (error instanceof NamespaceNotFoundError) {
                vscode.window.showErrorMessage(
                    "Failed to find a matching namespace",
                );

                return;
            }

            throw error;
        }
    }

    const userOptions: Record<string, string | undefined> = {};

    if (command.options?.length) {
        let pickOptions = command.options.map((option) => ({
            label: `${option.name} (${option.description})`,
            command: option.name,
        }));

        while (true) {
            const choice = await vscode.window.showQuickPick(
                [
                    {
                        label: EndSelection.Name,
                        command: EndSelection.Value,
                    },
                    ...pickOptions,
                ],
                {
                    placeHolder: "Select an option or end selection...",
                },
            );

            // Exit when the user press ESC
            if (choice === undefined) {
                return;
            }

            if (choice.command === EndSelection.Value) {
                break;
            }

            userOptions[choice.command] = choice.command;

            pickOptions.splice(pickOptions.indexOf(choice), 1);

            if (!pickOptions.length) {
                break;
            }
        }
    }

    const userArgumentsAsString = Object.entries(userArguments)
        .map(([_, value]) => value)
        .join(" ");

    const userOptionsAsString = Object.entries(userOptions)
        .map(([key, value]) => {
            if (key !== value) {
                return `${key}=${value}`;
            }

            return key;
        })
        .join(" ");

    artisan(
        `make:${command.name} ${userArgumentsAsString} ${userOptionsAsString}`,
        workspaceFolder.uri.fsPath,
    );
};
