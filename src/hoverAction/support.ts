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
        let string = "";

        this.commands.forEach((command) => {
            string += `[${command.title}](command:${command.command}?${encodeURIComponent(JSON.stringify(command.arguments))})`;
            string += `<span style="display: none;">&nbsp;&nbsp;&nbsp;</span>`;
        });

        const markdownString = new vscode.MarkdownString(string);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;

        return markdownString;
    }
}
