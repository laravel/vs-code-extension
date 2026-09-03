import path from "path";
import * as vscode from "vscode";

type ShellQuote = "'" | '"';

const getDefaultTerminal = (): string => {
    const terminal = vscode.env.shell.toLowerCase();

    return path.basename(terminal, path.extname(terminal));
};

const quoteShellArg = (
    arg: string,
    quote: ShellQuote = "'",
    escapedQuote: string = quote === "'" ? "'\\''" : '\\"',
): string => {
    if (arg === "") {
        return `${quote}${quote}`;
    }

    if (/^[A-Za-z0-9_/:=-]+$/.test(arg)) {
        return arg;
    }

    return `${quote}${arg.replaceAll(quote, escapedQuote)}${quote}`;
};

const argvToShell = (argv: string[], terminal: string): string[] => {
    switch (terminal) {
        case "powershell":
        case "pwsh":
        case "pwsh-preview":
            return ["&", ...argv.map((arg) => quoteShellArg(arg, "'", "''"))];

        case "cmd":
            return argv.map((arg) => quoteShellArg(arg, '"'));

        default:
            return argv.map((arg) => quoteShellArg(arg));
    }
};

export const argvToShellCommand = (
    argv: string[],
    terminal: string = getDefaultTerminal(),
): string => argvToShell(argv, terminal).join(" ");
