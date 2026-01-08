import * as vscode from "vscode";
import path from "path";

import { Argument, ArgumentType, Command, Option } from "./types";
import { getNamespace } from "@src/commands/generateNamespace";
import { escapeNamespace } from "@src/support/util";

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
        excludeIf: option.excludeIf,
    }));

    while (true) {
        const optionsAsString = getOptionsAsString(userOptions);

        const choice = await vscode.window.showQuickPick(
            [
                {
                    label: EndSelection,
                    command: EndSelection,
                    exclude: undefined,
                },
                ...pickOptions,
            ],
            {
                canPickMany: false,
                placeHolder:
                    optionsAsString || "Select an option or end selection.",
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

        pickOptions = pickOptions.filter(
            (option) =>
                option.command !== choice.command &&
                !option.excludeIf?.includes(choice.command),
        );

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

export const buildArtisanCommand = async (
    command: Command,
    uri: vscode.Uri,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<string | undefined> => {
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

    return `${command.name} ${getArgumentsAsString(userArguments)} ${getOptionsAsString(userOptions)}`;
};
