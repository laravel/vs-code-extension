export interface Command {
    name: string;
    arguments: Argument[];
    options?: Option[];
    postRun?: PostRunAction | undefined;
    confirmation?: Confirmation | undefined;
    runIn?: CommandRunTarget | undefined;
}

export type PostRunAction = "openGeneratedFile" | "none";
export type CommandRunTarget = "background" | "terminal";

export interface Confirmation {
    message: string;
}

export interface Option {
    name: string;
    type?: OptionType | undefined;
    options?: () => Record<string, string>;
    default?: ((...args: string[]) => string) | string;
    description?: string;
    excludeIf?: string[];
}

export type OptionType = "select" | "input";

export interface Argument {
    name: string;
    type?: ArgumentType | undefined;
    description?: string;
}

export type ArgumentType = "namespaceOrPath" | "namespace" | "path";
