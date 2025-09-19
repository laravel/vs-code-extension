import { getModels } from "@src/repositories/models";
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
    NamespaceOrPath,
    Namespace,
    Path,
}

enum EndSelection {
    Name = "End Selection",
    Value = "end-selection",
}

type SubCommand =
    | "cast"
    | "channel"
    | "command"
    | "component"
    | "controller"
    | "model"
    | "enum";

const forceOption: Option = {
    name: "--force",
    description: "Create the class even if the cast already exists",
};

const testOptions: Option[] = [
    {
        name: "--test",
        description: "Generate an accompanying Test test for the Controller",
    },
    {
        name: "--pest",
        description: "Generate an accompanying Pest test for the Controller",
    },
    {
        name: "--phpunit",
        description: "Generate an accompanying PHPUnit test for the Controller",
    },
];

export const commands: Command[] = [
    {
        name: "cast",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the cast class",
            },
        ],
        options: [
            forceOption,
            {
                name: "--inbound",
                description: "Generate an inbound cast class",
            },
        ],
    },
    {
        name: "channel",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the channel",
            },
        ],
        options: [forceOption],
    },
    {
        name: "command",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the command",
            },
        ],
        options: [forceOption, ...testOptions],
    },
    {
        name: "component",
        arguments: [
            {
                name: "name",
                type: ArgumentType.NamespaceOrPath,
                description: "The name of the component",
            },
        ],
        options: [
            forceOption,
            {
                name: "--inline",
                description: "Create a component that renders an inline view",
            },
            {
                name: "--view",
                description: "Create an anonymous component with only a view",
            },
            ...testOptions,
        ],
    },
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
            forceOption,
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
            {
                name: "--model",
                callback: () =>
                    Object.fromEntries(
                        Object.entries(getModels().items).map(([_, model]) => [
                            model.class,
                            // We need escape backslashes because finally it will be a part of CLI command
                            model.class.replace(/(?<!\\)\\(?!\\)/g, "\\\\"),
                        ]),
                    ),
                description:
                    "Generate a resource controller for the given model",
            },
            {
                name: "--resource",
                description: "Generate a resource controller class",
            },
            {
                name: "--requests",
                description:
                    "Generate FormRequest classes for store and update",
            },
            {
                name: "--singleton",
                description: "Generate a singleton resource controller class",
            },
            {
                name: "--creatable",
                description:
                    "Indicate that a singleton resource should be creatable",
            },
            ...testOptions,
        ],
    },
    {
        name: "enum",
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the enum",
            },
        ],
        options: [
            forceOption,
            {
                name: "--string",
                description: "Generate a string backed enum."
            },
            {
                name: "--int",
                description: "Generate an integer backed enum."
            }
        ],
    }
];

const getValueForArgumentType = async (
    value: string,
    argumentType: ArgumentType | undefined,
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
): Promise<string> => {
    switch (argumentType) {
        case ArgumentType.NamespaceOrPath:
            try {
                return await getValueForArgumentType(
                    value,
                    ArgumentType.Namespace,
                    workspaceFolder,
                    uri,
                );
            } catch (error) {
                if (error instanceof NamespaceNotFoundError) {
                    return await getValueForArgumentType(
                        value,
                        ArgumentType.Path,
                        workspaceFolder,
                        uri,
                    );
                }

                throw error;
            }

        case ArgumentType.Namespace:
            // User can input a relative path, for example: NewFolder\NewFile
            // or NewFolder/NewFile, so we need to convert it to a new Uri
            const newUri = vscode.Uri.joinPath(uri, value);

            const fileName = path.parse(newUri.fsPath).name;

            const namespace = await getNamespace(workspaceFolder, newUri);

            return (
                `${namespace}\\${fileName}`
                    .replace(/\//g, "\\")
                    // We need escape backslashes because finally it will be a part of CLI command
                    .replace(/(?<!\\)\\(?!\\)/g, "\\\\")
            );
        default:
            return value;
    }
};

const getUserArguments = async (
    commandArguments: Argument[],
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
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

        let value = choice.command;

        const option = commandOptions.find(
            (option) => option.name === choice.command,
        );

        if (option?.callback) {
            const callbackChoice = await vscode.window.showQuickPick(
                Object.entries(option.callback()).map(([key, value]) => ({
                    label: key,
                    command: value,
                })),
            );

            // Once again if the user cancels the selection by pressing ESC
            if (callbackChoice === undefined) {
                continue;
            }

            value = callbackChoice.command;
        }

        userOptions[choice.command] = value;

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

    if (error?.[1]) {
        vscode.window.showErrorMessage(error[1]);

        return;
    }

    const paths = output.match(/\[(.*?)\]/g);

    if (!paths) {
        vscode.window.showErrorMessage(
            "Failed to get the path of the new file",
        );

        return;
    }

    // If artisan command creates multiple files, the last one is the one we want, I hope so :P
    //
    // INFO  Test [tests/Feature/Http/Controllers/NewControllerTest.php] created successfully.
    // INFO  Controller [app/Http/Controllers/NewController.php] created successfully.
    const lastPath = paths[paths.length - 1].slice(1, -1);

    const fullPath = path.join(workspaceFolder.uri.fsPath, lastPath);

    openFileCommand(vscode.Uri.file(fullPath), 1, 1);
};
