import * as vscode from "vscode";

export const appendProps = (
    markdown: vscode.MarkdownString,
    props: {
        name: string;
        type: string;
        hasDefaultValue: boolean;
        defaultValue: string;
    }[],
) => {
    const result = props.map((prop) =>
        [
            `${prop.type} \$${prop.name}`,
            prop.hasDefaultValue ? ` = ${prop.defaultValue}` : "",
        ].join(""),
    );

    markdown.appendCodeblock(`<?php\n${result.join("\n")}`, "php");
};
