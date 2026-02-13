import * as vscode from "vscode";
import { getPaths } from "@src/repositories/paths";
import { projectPath } from "@src/support/project";

export interface TeamcityEvent {
    type: string;
    attributes: Record<string, string>;
}

export const parseLine = (line: string): TeamcityEvent | null => {
    const match = line.match(/##teamcity\[(\w+)(.*)]/);

    if (!match) {
        return null;
    }

    const type = match[1];
    const attributesString = match[2];
    const attributes: Record<string, string> = {};

    const attributePattern = /([\w-]+)='((?:[^'|]|\|.)*)'/g;
    let attrMatch;

    while ((attrMatch = attributePattern.exec(attributesString)) !== null) {
        attributes[attrMatch[1]] = unescapeValue(attrMatch[2]);
    }

    return { type, attributes };
};

const unescapeValue = (value: string): string => {
    return value
        .replace(/\|n/g, "\n")
        .replace(/\|r/g, "\r")
        .replace(/\|'/g, "'")
        .replace(/\|\[/g, "[")
        .replace(/\|]/g, "]")
        .replace(/\|\|/g, "|");
};

export const buildErrorMessage = (event: TeamcityEvent): vscode.TestMessage => {
    const message = new vscode.TestMessage(
        event.attributes.message || "Test failed.",
    );

    const details = event.attributes.details;

    if (!details) {
        return message;
    }

    const lines = details.split("\n").filter((line) => line.trim());
    const lastLine = lines[lines.length - 1];

    if (!lastLine) {
        return message;
    }

    const lastColonIndex = lastLine.lastIndexOf(":");

    if (lastColonIndex === -1) {
        return message;
    }

    const file = resolveToHostPath(lastLine.substring(0, lastColonIndex));
    const line = parseInt(lastLine.substring(lastColonIndex + 1), 10);

    if (isNaN(line)) {
        return message;
    }

    message.location = new vscode.Location(
        vscode.Uri.file(file),
        new vscode.Position(line - 1, 0),
    );

    return message;
};

const resolveToHostPath = (containerPath: string): string => {
    const basePath = getPaths().items.find(
        (item) => item.key === "base_path",
    )?.path;

    if (basePath && containerPath.startsWith(basePath)) {
        return projectPath(containerPath.slice(basePath.length + 1));
    }

    return containerPath;
};
