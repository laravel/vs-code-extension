import { artisan } from "@src/support/php";
import path from "path";
import * as vscode from "vscode";
import { openFileCommand } from ".";
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
    arguments: [Argument, ...Argument[]];
    options?: Option[];
}

enum ArgumentType {
    Namespace = "namespace",
}

enum EndSelection {
    Name = "End Selection",
    Value = "end-selection",
}

type SubCommand = "controller" | "model";

export const commands: Command[] = [
    {
        name: "controller",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the controller",
            }
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
                // We need escape backslashes because finally it will be a part of CLI command
                .replace(/(?<!\\)\\(?!\\)/g, "\\\\");
        default:
            return value;
    }
};

const getUserArguments = async (
    commandArguments: Argument[],
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri
): Promise<Record<string, string> | undefined> => {
    const userArguments: Record<string, string> = {};

    for (const argument of commandArguments) {
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

    return userArguments;
};

const getArgumentsAsString = (userArguments: Record<string, string>) =>
    Object.entries(userArguments)
        .map(([_, value]) => value)
        .join(" ");

const getUserOptions = async (
    commandOptions: Option[] | undefined,
): Promise<Record<string, string | undefined> | undefined> => {
    const userOptions: Record<string, string | undefined> = {};

    if (!commandOptions?.length) {
        return userOptions;
    }

    let pickOptions = commandOptions.map((option) => ({
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

    return userOptions;
};

const getOptionsAsString = (userOptions: Record<string, string | undefined>) =>
    Object.entries(userOptions)
        .map(([key, value]) => {
            if (key !== value) {
                return `${key}=${value}`;
            }

            return key;
        })
        .join(" ");

export const artisanMakeCommandNameSubCommandName = (command: SubCommand) =>
    `laravel.artisan.make.${command}`;

export const artisanMakeCommand = async (command: Command, uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot detect active workspace");

        return;
    }

    const userArguments = await getUserArguments(
        command.arguments,
        workspaceFolder,
        uri,
    );

    if (!userArguments) {
        return;
    }

    const userOptions = await getUserOptions(command.options);

    if (!userOptions) {
        return;
    }

    const userArgumentsAsString = getArgumentsAsString(userArguments);
    const userOptionsAsString = getOptionsAsString(userOptions);

    const output = await artisan(
        `make:${command.name} ${userArgumentsAsString} ${userOptionsAsString}`,
        workspaceFolder.uri.fsPath,
    );

    const error = output.match(/ERROR\s+(.*)/);

    if (error) {
        vscode.window.showErrorMessage(error[1]);

        return;
    }

    const filePath = output.match(/\[(.*?)\]/)?.[1];

    if (!filePath) {
        vscode.window.showErrorMessage("Failed to get the path of the new file");

        return;
    }

    const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);

    openFileCommand(vscode.Uri.file(fullPath), 1, 1);
};
