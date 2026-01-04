import * as vscode from "vscode";

export class HoverActions {
    private readonly commands: vscode.Command[];

    constructor(commands: vscode.Command[] = []) {
        this.commands = commands;
    }

    public push(command: vscode.Command): this {
        this.commands.push(command);

        return this;
    }

    public getAsMarkdownString(): vscode.MarkdownString {
        const string = this.commands
            .map((command) => {
                return [
                    `[${command.title}](command:${command.command}?${encodeURIComponent(JSON.stringify(command.arguments))})`,
                    `<span style="display: none;">${"&nbsp;".repeat(3)}</span>`,
                ].join("");
            })
            .join("");

        const markdownString = new vscode.MarkdownString(string);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;

        return markdownString;
    }
}
