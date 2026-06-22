const quoteShellArg = (arg: string): string => {
    if (arg === "") {
        return "''";
    }

    if (/^[A-Za-z0-9_/:=-]+$/.test(arg)) {
        return arg;
    }

    return `'${arg.replace(/'/g, "'\\''")}'`;
};

export const argvToShellCommand = (argv: string[]): string =>
    argv.map(quoteShellArg).join(" ");
