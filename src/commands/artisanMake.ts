import { getModels } from "@src/repositories/models";
import { artisan } from "@src/support/php";
import { getWorkspaceFolders } from "@src/support/project";
import * as os from "os";
import path from "path";
import * as vscode from "vscode";
import { openFileCommand } from ".";
import { getNamespace } from "./generateNamespace";

interface Argument {
    name: string;
    type?: ArgumentType | undefined;
    description?: string;
}

interface Option {
    name: string;
    type?: OptionType | undefined;
    callback?: () => Record<string, string>;
    description?: string;
}

interface Command {
    name: SubCommand;
    submenu?: boolean;
    arguments: [Argument, ...Argument[]];
    options?: Option[];
}

enum OptionType {
    Select,
    Input,
}

enum ArgumentType {
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
    | "class"
    | "command"
    | "component"
    | "controller"
    | "model"
    | "enum"
    | "event"
    | "exception"
    | "factory"
    | "interface"
    | "job"
    | "job-middleware"
    | "listener"
    | "livewire"
    | "mail"
    | "middleware"
    | "migration"
    | "notification"
    | "observer"
    | "policy"
    | "provider"
    | "request"
    | "resource"
    | "rule"
    | "scope"
    | "seeder"
    | "service"
    | "test"
    | "trait"
    | "view";

const forceOption: Option = {
    name: "--force",
    description: "Create the class even if the cast already exists",
};

const testOptions: Option[] = [
    {
        name: "--test",
        description: "Generate an accompanying Test test for the class",
    },
    {
        name: "--pest",
        description: "Generate an accompanying Pest test for the class",
    },
    {
        name: "--phpunit",
        description: "Generate an accompanying PHPUnit test for the class",
    },
];

export const commands: Command[] = [
    {
        name: "cast",
        submenu: true,
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
        submenu: true,
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
        name: "class",
        submenu: false,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the class",
            },
        ],
        options: [
            forceOption,
            {
                name: "--invokable",
                description: "Generate a single method, invokable class",
            },
        ],
    },
    {
        name: "command",
        submenu: true,
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
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
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
        submenu: true,
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
                name: "--invokable",
                description: "Generate a single method, invokable class",
            },
            {
                name: "--api",
                description:
                    "Exclude the create and edit methods from the controller",
            },
            {
                name: "--model",
                type: OptionType.Select,
                callback: () => getModelClassnames(),
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
        submenu: true,
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
                description: "Generate a string backed enum.",
            },
            {
                name: "--int",
                description: "Generate an integer backed enum.",
            },
        ],
    },
    {
        name: "event",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the event",
            },
        ],
        options: [forceOption],
    },
    {
        name: "exception",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the exception",
            },
        ],
        options: [
            forceOption,
            {
                name: "--render",
                description: "Create the exception with an empty render method",
            },
            {
                name: "--report",
                description: "Create the exception with an empty report method",
            },
        ],
    },
    {
        name: "factory",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the factory",
            },
        ],
        options: [
            {
                name: "--model",
                type: OptionType.Select,
                callback: () => getModelClassnames(),
                description: "The name of the model",
            },
        ],
    },
    {
        name: "interface",
        submenu: false,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the interface",
            },
        ],
        options: [forceOption],
    },
    {
        name: "job",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the job",
            },
        ],
        options: [
            forceOption,
            {
                name: "--sync",
                description: "Indicates that job should be synchronous",
            },
            ...testOptions,
        ],
    },
    {
        name: "job-middleware",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the job middleware",
            },
        ],
        options: [forceOption, ...testOptions],
    },
    {
        name: "listener",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the listener",
            },
        ],
        options: [
            forceOption,
            {
                name: "--queued",
                description: "Indicates that listener should be queued",
            },
            ...testOptions,
        ],
    },
    {
        name: "livewire",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Path,
                description: "The name of the Livewire component",
            },
        ],
        options: [
            forceOption,
            {
                name: "--inline",
                description: "Create a component that renders an inline view",
            },
            ...testOptions,
        ],
    },
    {
        name: "mail",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the mail",
            },
        ],
        options: [
            forceOption,
            {
                name: "--markdown",
                description: "Create a new Markdown template for the mailable",
            },
            {
                name: "--view",
                description: "Create a new Blade template for the mailable",
            },
            ...testOptions,
        ],
    },
    {
        name: "middleware",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the middleware",
            },
        ],
        options: [forceOption],
    },
    {
        name: "migration",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Path,
                description: "The name of the migration",
            },
        ],
        options: [
            {
                name: "--create",
                type: OptionType.Input,
                description: "The table to be created",
            },
            {
                name: "--table",
                type: OptionType.Input,
                description: "The table to migrate",
            },
        ],
    },
    {
        name: "model",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the model",
            },
        ],
        options: [
            forceOption,
            {
                name: "--all",
                description:
                    "Generate a migration, seeder, factory, policy, resource controller, and form request classes for the model",
            },
            {
                name: "--controller",
                description: "Create a new controller for the model",
            },
            {
                name: "--factory",
                description: "Create a new factory for the model",
            },
            {
                name: "--migration",
                description: "Create a new migration file for the model",
            },
            {
                name: "--morph-pivot",
                description:
                    "Indicates if the generated model should be a custom polymorphic intermediate table model",
            },
            {
                name: "--policy",
                description: "Create a new policy for the model",
            },
            {
                name: "--seed",
                description: "Create a new seeder for the model",
            },
            {
                name: "--pivot",
                description:
                    "Indicates if the generated model should be a custom intermediate table model",
            },
            {
                name: "--resource",
                description:
                    "Indicates if the generated controller should be a resource controller",
            },
            {
                name: "--api",
                description:
                    "Indicates if the generated controller should be an API resource controller",
            },
            {
                name: "--requests",
                description:
                    "Create new form request classes and use them in the resource controller",
            },
            ...testOptions,
        ],
    },
    {
        name: "notification",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the notification",
            },
        ],
        options: [
            forceOption,
            {
                name: "--markdown",
                description:
                    "Create a new Markdown template for the notification",
            },
            ...testOptions,
        ],
    },
    {
        name: "observer",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the observer",
            },
        ],
        options: [
            forceOption,
            {
                name: "--model",
                type: OptionType.Select,
                callback: () => getModelClassnames(),
                description: "The model that the observer applies to",
            },
        ],
    },
    {
        name: "policy",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the policy",
            },
        ],
        options: [
            forceOption,
            {
                name: "--model",
                type: OptionType.Select,
                callback: () => getModelClassnames(),
                description: "The model that the policy applies to",
            },
            {
                name: "--guard",
                type: OptionType.Input,
                description: "The guard that the policy relies on",
            },
        ],
    },
    {
        name: "provider",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the service provider",
            },
        ],
        options: [forceOption],
    },
    {
        name: "request",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the request",
            },
        ],
        options: [forceOption],
    },
    {
        name: "resource",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the resource",
            },
        ],
        options: [
            forceOption,
            {
                name: "--collection",
                description: "Create a resource collection",
            },
        ],
    },
    {
        name: "scope",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the scope",
            },
        ],
        options: [forceOption],
    },
    {
        name: "seeder",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Path,
                description: "The name of the seeder",
            },
        ],
    },
    {
        name: "test",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the test",
            },
        ],
        options: [
            forceOption,
            {
                name: "--unit",
                description: "Create a unit test",
            },
            {
                name: "--pest",
                description: "Create a Pest test",
            },
            {
                name: "--phpunit",
                description: "Create a PHPUnit test",
            },
        ],
    },
    {
        name: "trait",
        submenu: false,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Namespace,
                description: "The name of the trait",
            },
        ],
        options: [forceOption],
    },
    {
        name: "view",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: ArgumentType.Path,
                description: "The name of the view",
            },
        ],
        options: [forceOption, ...testOptions],
    },
];

const getModelClassnames = (): Record<string, string> => {
    return Object.fromEntries(
        Object.entries(getModels().items).map(([_, model]) => [
            model.class,
            escapeNamespace(model.class),
        ]),
    );
};

const escapeNamespace = (namespace: string): string => {
    if (
        ["linux", "openbsd", "sunos", "darwin"].some((unixPlatforms) =>
            os.platform().includes(unixPlatforms),
        )
    ) {
        // We need to escape backslashes because finally it will be a part of CLI command
        return namespace.replace(/(?<!\\)\\(?!\\)/g, "\\\\");
    }

    return namespace;
};

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

            let namespace = await getNamespace(workspaceFolder, newUri);

            namespace = namespace ? (namespace += "\\") : "";

            return escapeNamespace(
                `${namespace}${fileName}`.replace(/\//g, "\\").trim(),
            );

        case ArgumentType.Path:
            // OS path separators
            return path.normalize(value.replace("\\", "/")).trim();

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
        label: `${option.name} ${option.description}`,
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

        let value = undefined;

        const option = commandOptions.find(
            (option) => option.name === choice.command,
        );

        if (option?.type === OptionType.Select && option?.callback) {
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

        if (option?.type === OptionType.Input) {
            let input = undefined;

            while (!input) {
                input = await vscode.window.showInputBox({
                    prompt: option.description,
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
        .map(([key, value]) => {
            if (key !== value) {
                return `${key}=${value}`;
            }

            return key;
        })
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
            return paths?.[1];
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

export const artisanMakeCommandNameSubCommandName = (command: SubCommand) =>
    `laravel.artisan.make.${command}`;

export const artisanMakeOpenSubmenuCommand = async () => {
    const choice = await vscode.window.showQuickPick(
        commands
            .filter((command) => command.submenu === true)
            .map((command) => {
                const name =
                    command.name.charAt(0).toUpperCase() +
                    command.name.slice(1);

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

export const artisanMakeCommand = async (command: Command, uri: vscode.Uri) => {
    uri ??= vscode.Uri.joinPath(getWorkspaceFolders()[0]?.uri);

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
