import { ViewItem } from "@src/repositories/views";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";

export const livewireHover = (
    livewire: NonNullable<ViewItem["livewire"]>,
): vscode.Hover => {
    const markdown = new vscode.MarkdownString();

    const files = livewire.files.map((path) => {
        return `[${path}](${vscode.Uri.file(projectPath(path))})`;
    });

    markdown.appendMarkdown(files.join("\n\n"));

    appendProps(markdown, livewire.props);

    return new vscode.Hover(markdown);
};

export const appendProps = (
    markdown: vscode.MarkdownString,
    props: {
        name: string;
        type: string;
        hasDefaultValue: boolean;
        defaultValue: string;
    }[],
) => {
    if (props.length === 0) {
        return;
    }

    const result = props.map((prop) =>
        [
            `${prop.type} \$${prop.name}`,
            prop.hasDefaultValue ? ` = ${prop.defaultValue}` : "",
            ";",
        ].join(""),
    );

    markdown.appendCodeblock(`<?php\n${result.join("\n")}`, "php");
};
