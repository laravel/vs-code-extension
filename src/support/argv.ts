import path from "path";
import * as vscode from "vscode";

type ShellQuote = "'" | '"';

const getDefaultTerminal = (): string => {
    const terminal = vscode.env.shell.toLowerCase();

    return path.basename(terminal, path.extname(terminal));
};

const quoteShellArg = (arg: string, quote: ShellQuote = "'"): string => {
    if (arg === "") {
        return "";
    }

    if (/^[A-Za-z0-9_/:=-]+$/.test(arg)) {
        return arg;
    }

    if (quote === "'") {
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }

    return `"${arg.replace(/"/g, '\\"')}"`;
};

const argvToShell = (argv: string[]): string[] => {
    switch (getDefaultTerminal()) {
        case "powershell":
            return ["&", ...argv.map((arg) => quoteShellArg(arg))];

        case "cmd":
            return argv.map((arg) => quoteShellArg(arg, '"'));

        default:
            return argv.map((arg) => quoteShellArg(arg));
    }
};

export const argvToShellCommand = (argv: string[]): string => {
    if (argv.length === 0) {
        return "";
    }

    return argvToShell(argv).join(" ");
};
