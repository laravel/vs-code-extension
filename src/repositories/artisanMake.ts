import { kebab } from "@src/support/str";
import { escapeNamespace } from "@src/support/util";
import { getModels } from "./models";

export interface Argument {
    name: string;
    type?: ArgumentType | undefined;
    description?: string;
}

export interface Option {
    name: string;
    type?: OptionType | undefined;
    options?: () => Record<string, string>;
    default?: ((...args: string[]) => string) | string;
    description?: string;
}

export interface Command {
    name: SubCommand;
    submenu?: boolean;
    arguments: [Argument, ...Argument[]];
    options?: Option[];
}

type OptionType = "select" | "input";

export type ArgumentType = "namespaceOrPath" | "namespace" | "path";

export type SubCommand =
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

const commands: Command[] = [
    {
        name: "cast",
        submenu: true,
        arguments: [
            {
                name: "name",
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespaceOrPath",
                description: "The name of the component",
            },
        ],
        options: [
            forceOption,
            {
                name: "--path",
                type: "input",
                default: "components",
                description:
                    "The location where the component view should be created",
            },
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
                type: "namespace",
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
                type: "select",
                options: () => getModelClassnames(),
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
                description: "The name of the factory",
            },
        ],
        options: [
            {
                name: "--model",
                type: "select",
                options: () => getModelClassnames(),
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "path",
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
                type: "namespace",
                description: "The name of the mail",
            },
        ],
        options: [
            forceOption,
            {
                name: "--markdown",
                description: "Create a new Markdown template for the mailable",
                type: "input",
                default: (name: string): string =>
                    kebab(name.replaceAll("\\\\", "/")),
            },
            {
                name: "--view",
                description: "Create a new Blade template for the mailable",
                type: "input",
                default: (name: string): string =>
                    kebab(name.replaceAll("\\\\", "/")),
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
                type: "namespace",
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
                type: "path",
                description: "The name of the migration",
            },
        ],
        options: [
            {
                name: "--create",
                type: "input",
                description: "The table to be created",
            },
            {
                name: "--table",
                type: "input",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
                description: "The name of the observer",
            },
        ],
        options: [
            forceOption,
            {
                name: "--model",
                type: "select",
                options: () => getModelClassnames(),
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
                type: "namespace",
                description: "The name of the policy",
            },
        ],
        options: [
            forceOption,
            {
                name: "--model",
                type: "select",
                options: () => getModelClassnames(),
                description: "The model that the policy applies to",
            },
            {
                name: "--guard",
                type: "input",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "path",
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
                type: "namespace",
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
                type: "namespace",
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
                type: "path",
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

export const getArtisanMakeCommands = () => commands;
