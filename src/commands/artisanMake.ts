import {
    Argument,
    ArgumentType,
    Command,
    getArtisanMakeCommands,
    Option,
    SubCommand,
} from "@src/repositories/artisanMakeCommands";
import { artisan } from "@src/support/php";
import { getWorkspaceFolders } from "@src/support/project";
import { ucfirst } from "@src/support/str";
import { escapeNamespace } from "@src/support/util";
import path from "path";
import * as vscode from "vscode";
import { openFileCommand } from ".";
import { getNamespace } from "./generateNamespace";

const EndSelection = "End Selection";

const getValueForArgumentType = async (
    value: string,
    argumentType: ArgumentType | undefined,
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
): Promise<string> => {
    switch (argumentType) {
        case "namespaceOrPath":
        case "namespace":
            // User can input a relative path, for example: NewFolder\NewFile
            // or NewFolder/NewFile, so we need to convert it to a new Uri
            const newUri = vscode.Uri.joinPath(uri, value);

            const fileName = path.parse(newUri.fsPath).name;

            // Always try to get the full namespace because it supports
            // projects with modular architecture
            let namespace = await getNamespace(workspaceFolder, newUri);

            if (!namespace && argumentType === "namespaceOrPath") {
                return getValueForArgumentType(
                    value,
                    "path",
                    workspaceFolder,
                    uri,
                );
            }

            namespace = namespace ? (namespace += `\\${fileName}`) : value;

            return escapeNamespace(namespace.replaceAll("/", "\\").trim());

        case "path":
            // OS path separators
            return path.normalize(value.replaceAll("\\", "/")).trim();

        default:
            return value.trim();
    }
};

const validateInput = (input: string, field: string): boolean => {
    if (input === "") {
        vscode.window.showWarningMessage(`${field} is required`);

        return false;
    }

    if (/\s/.test(input)) {
        vscode.window.showWarningMessage(`${field} cannot contain spaces`);

        return false;
    }

    return true;
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

            if (!validateInput(input, `Argument ${argument.name}`)) {
                input = undefined;
            }
        }

        userArguments[argument.name] = await getValueForArgumentType(
            input,
            argument.type,
            workspaceFolder,
            uri,
        );
    }

    return userArguments;
};

const getArgumentsAsString = (userArguments: Record<string, string>) =>
    Object.values(userArguments).join(" ");

const getUserOptions = async (
    commandOptions: Option[] | undefined,
    userArguments: Record<string, string>,
): Promise<Record<string, string | undefined> | undefined> => {
    const userOptions: Record<string, string | undefined> = {};

    if (!commandOptions?.length) {
        return userOptions;
    }

    let pickOptions = commandOptions.map((option) => ({
        label: `${option.name} ${option.description}`,
        command: option.name,
    }));

    while (true) {
        const choice = await vscode.window.showQuickPick(
            [
                {
                    label: EndSelection,
                    command: EndSelection,
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

        if (choice.command === EndSelection) {
            break;
        }

        let value = undefined;

        const option = commandOptions.find(
            (option) => option.name === choice.command,
        );

        if (option?.type === "select" && option?.options) {
            const optionsChoice = await vscode.window.showQuickPick(
                Object.entries(option.options()).map(([key, value]) => ({
                    label: key,
                    command: value,
                })),
            );

            // Once again if the user cancels the selection by pressing ESC
            if (optionsChoice === undefined) {
                continue;
            }

            value = optionsChoice.command;
        }

        if (option?.type === "input") {
            let input = undefined;

            while (!input) {
                let _default = undefined;

                if (typeof option.default === "string") {
                    _default = option.default;
                }

                if (typeof option.default === "function") {
                    _default = option.default(...Object.values(userArguments));
                }

                input = await vscode.window.showInputBox({
                    prompt: option.description,
                    value: _default ?? "",
                });

                // Exit when the user press ESC
                if (input === undefined) {
                    break;
                }

                if (!validateInput(input, `Value for ${option.name}`)) {
                    input = undefined;
                }
            }

            // Once again if the user cancels the selection by pressing ESC
            if (input === undefined) {
                continue;
            }

            value = input;
        }

        userOptions[choice.command] = value ?? choice.command;

        // Remove the option from the list
        pickOptions.splice(pickOptions.indexOf(choice), 1);

        if (!pickOptions.length) {
            break;
        }
    }

    return userOptions;
};

const getOptionsAsString = (userOptions: Record<string, string | undefined>) =>
    Object.entries(userOptions)
        .map(([key, value]) => (key !== value ? `${key}=${value}` : key))
        .join(" ");

const getPathFromOutput = (
    output: string,
    command: SubCommand,
    workspaceFolder: vscode.WorkspaceFolder,
    uri: vscode.Uri,
): string | undefined => {
    let paths;

    // Unfortunately, Livewire has own output format for make:livewire
    if (command === "livewire") {
        paths = output.match(/CLASS:\s+(.*)/);

        if (paths?.[1]) {
            return path.join(workspaceFolder.uri.fsPath, paths?.[1]);
        }
    }

    paths = output.match(/\[(.*?)\]/g)?.map((path) => path.slice(1, -1));

    if (!paths) {
        return;
    }

    // If artisan command creates multiple files, we have to find the right one, for example:
    //
    // INFO  Test [tests/Feature/Http/Controllers/NewControllerTest.php] created successfully.
    // INFO  Controller [app/Http/Controllers/NewController.php] created successfully.
    const outputPath = paths
        // Windows always returns absolute paths, Linux returns relative. We have to normalize the paths
        .map((_path) =>
            path.isAbsolute(_path)
                ? path.relative(workspaceFolder.uri.fsPath, _path)
                : _path,
        )
        .map((_path) => path.join(workspaceFolder.uri.fsPath, _path))
        .find((_path) => _path.startsWith(uri.fsPath));

    if (!outputPath) {
        return;
    }

    return outputPath;
};

const getWorkspaceFolder = (
    uri: vscode.Uri | undefined,
): vscode.WorkspaceFolder | undefined => {
    let workspaceFolder = undefined;

    // Case when the user uses VSCode explorer/context (click on a folder in explorer)
    if (uri) {
        workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    // Case when the user uses VSCode command palette (click on "Laravel: Create new file")
    // and some file is open in the editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const fileUri = editor.document.uri;

        workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

        if (workspaceFolder) {
            return workspaceFolder;
        }
    }

    // Case when the user uses VSCode command palette (click on "Laravel: Create new file")
    // and no file is open in the editor
    return getWorkspaceFolders()?.[0];
};

export const artisanMakeCommandNameSubCommandName = (command: SubCommand) =>
    `laravel.artisan.make.${command}`;

export const artisanMakeOpenSubmenuCommand = async () => {
    const choice = await vscode.window.showQuickPick(
        getArtisanMakeCommands()
            .filter((command) => command.submenu)
            .map((command) => {
                const name = ucfirst(command.name);

                return {
                    label: `New ${name}...`,
                    command: artisanMakeCommandNameSubCommandName(command.name),
                };
            }),
        {
            placeHolder: "Select file type...",
        },
    );

    if (choice) {
        vscode.commands.executeCommand(choice.command);
    }
};

export const artisanMakeCommand = async (
    command: Command,
    uri?: vscode.Uri | undefined,
) => {
    const workspaceFolder = getWorkspaceFolder(uri);

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot detect active workspace");

        return;
    }

    uri ??= vscode.Uri.joinPath(workspaceFolder.uri);

    const userArguments = await getUserArguments(
        command.arguments,
        workspaceFolder,
        uri,
    );

    if (!userArguments) {
        return;
    }

    const userOptions = await getUserOptions(command.options, userArguments);

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
    }

    const outputPath = getPathFromOutput(
        output,
        command.name,
        workspaceFolder,
        uri,
    );

    if (!outputPath) {
        vscode.window.showErrorMessage(
            "Failed to get the path of the new file",
        );

        return;
    }

    openFileCommand(vscode.Uri.file(outputPath), 1, 1);
};
