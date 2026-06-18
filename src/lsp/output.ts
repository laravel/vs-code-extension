import * as vscode from "vscode";

const outputChannelName = "Laravel LSP";
const outputPrefix = `[${outputChannelName}] `;

export function createLspOutputChannel(): vscode.OutputChannel {
    const outputChannel = vscode.window.createOutputChannel(outputChannelName);

    if (!shouldMirrorLspOutputToStderr()) {
        return outputChannel;
    }

    return new StderrMirroringOutputChannel(outputChannel);
}

export function shouldMirrorLspOutputToStderr(): boolean {
    return (
        process.env.GITHUB_ACTIONS === "true" ||
        process.env.LARAVEL_LSP_OUTPUT_TO_STDERR === "true"
    );
}

class StderrMirroringOutputChannel implements vscode.OutputChannel {
    private atLineStart = true;

    constructor(private readonly outputChannel: vscode.OutputChannel) {}

    get name(): string {
        return this.outputChannel.name;
    }

    append(value: string): void {
        this.outputChannel.append(value);
        this.write(value);
    }

    appendLine(value: string): void {
        this.outputChannel.appendLine(value);
        this.write(`${value}\n`);
    }

    replace(value: string): void {
        this.outputChannel.replace(value);
        this.write(value);
    }

    clear(): void {
        this.outputChannel.clear();
    }

    show(preserveFocus?: boolean): void;
    show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
    show(
        columnOrPreserveFocus?: vscode.ViewColumn | boolean,
        preserveFocus?: boolean,
    ): void {
        if (typeof columnOrPreserveFocus === "number") {
            this.outputChannel.show(columnOrPreserveFocus, preserveFocus);

            return;
        }

        this.outputChannel.show(columnOrPreserveFocus);
    }

    hide(): void {
        this.outputChannel.hide();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }

    private write(value: string): void {
        if (!value) {
            return;
        }

        let output = "";

        for (const character of value) {
            if (this.atLineStart) {
                output += outputPrefix;
            }

            output += character;
            this.atLineStart = character === "\n";
        }

        process.stderr.write(output);
    }
}
