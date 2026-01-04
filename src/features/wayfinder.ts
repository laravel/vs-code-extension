import { HoverActions } from "@src/support/hoverAction";
import { projectPath } from "@src/support/project";
import { detect, languageService } from "@src/tsParser/tsParser";
import { TsParsingResult } from "@src/types";
import * as vscode from "vscode";

const isInHoverRange = (
    context: TsParsingResult.ContextValue,
    offset: number,
): boolean => offset >= context.start && offset <= context.end;

const findContextAtOffset = (
    contexts: TsParsingResult.ContextValue[],
    offset: number,
): TsParsingResult.ContextValue | undefined => {
    for (const child of contexts) {
        if (!isInHoverRange(child, offset)) {
            continue;
        }

        return findContextAtOffset(child.children, offset) ?? child;
    }

    return undefined;
};

export class WayfinderHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);

        if (!range) {
            return null;
        }

        const contexts = detect(document);

        if (!contexts) {
            return null;
        }

        const foundContext = findContextAtOffset(
            contexts,
            document.offsetAt(position),
        );

        if (foundContext?.type !== "methodCall") {
            return null;
        }

        if (
            !foundContext.returnTypes.some(
                (type) =>
                    ["RouteDefinition", "RouteFormDefinition"].some((name) =>
                        type.name.startsWith(name),
                    ) && type.importPath?.endsWith("/wayfinder/index.ts"),
            )
        ) {
            return null;
        }

        const quickInfo = languageService.getQuickInfoAtPosition(
            document.fileName,
            foundContext.start,
        );

        const controllerTag = quickInfo?.tags?.find(
            (tag) =>
                tag.name === "see" &&
                (tag.text?.some((text) =>
                    /Controller\.php:\d+$/.test(text.text),
                ) ||
                    false),
        );

        if (!controllerTag) {
            return null;
        }

        const [controllerPath, lineAsString] = controllerTag.text
            ?.map((text) => text.text.trim())
            .join("")
            .split(":") || [undefined, undefined];

        if (!controllerPath) {
            return null;
        }

        const line = lineAsString ? Number(lineAsString) : undefined;

        const hoverActions = new HoverActions([
            {
                title: "Go to controller",
                command: "laravel.open",
                arguments: [
                    vscode.Uri.file(projectPath(controllerPath)),
                    line ?? 0,
                    0,
                ],
            },
        ]);

        return new vscode.Hover(hoverActions.getAsMarkdownString(), range);
    }
}
