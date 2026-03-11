import { getRoutes } from "@src/repositories/routes";
import { config } from "@src/support/config";
import { relativePath } from "@src/support/project";
import * as vscode from "vscode";

export const copyRoutePathCommand = "laravel.route.copyPath";

const ROUTE_FILE_REGEX = /(^|[\\/])[Rr]outes?(?:[\\/].+)?\.php$/;

type ParsedRouteLine = {
    methods: string[];
    uri: string;
};

const toSlashPath = (input: string) => input.replace(/\\/g, "/");

const normalizePath = (input: string) => {
    return toSlashPath(input).replace(/^\.\//, "");
};

const normalizeUri = (input: string) => {
    const cleaned = input.trim();

    if (cleaned === "/") {
        return "/";
    }

    return cleaned.replace(/^\/+/, "").replace(/\/+$/, "");
};

const parseMethodsFromMatch = (source: string): string[] => {
    const methods: string[] = [];
    const methodRegex = /['\"]([A-Za-z]+)['\"]/g;
    let match: RegExpExecArray | null = null;

    while ((match = methodRegex.exec(source)) !== null) {
        methods.push(match[1].toUpperCase());
    }

    return Array.from(new Set(methods));
};

const parseRouteLine = (line: string): ParsedRouteLine | null => {
    const standard =
        /Route::\s*(get|post|put|patch|delete|options|head|any)\s*\(\s*(['\"])([^'\"]+)\2/i.exec(
            line,
        );

    if (standard) {
        const method = standard[1].toUpperCase();

        if (method === "ANY") {
            return {
                methods: [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS",
                    "HEAD",
                ],
                uri: standard[3],
            };
        }

        return {
            methods: [method],
            uri: standard[3],
        };
    }

    const matchRoute =
        /Route::\s*match\s*\(\s*\[([^\]]+)\]\s*,\s*(['\"])([^'\"]+)\2/i.exec(
            line,
        );

    if (matchRoute) {
        const methods = parseMethodsFromMatch(matchRoute[1]);

        if (methods.length === 0) {
            return null;
        }

        return {
            methods,
            uri: matchRoute[3],
        };
    }

    return null;
};

const routeMethods = (method: string) =>
    method
        .split("|")
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean);

const scoreRouteMatch = (
    route: {
        method: string;
        uri: string;
        filename: string | null;
        line: number | null;
    },
    parsed: ParsedRouteLine,
    documentPath: string,
    lineNumber: number,
): number => {
    const declaredUri = normalizeUri(parsed.uri);
    const candidateUri = normalizeUri(route.uri);
    const methods = routeMethods(route.method);

    if (!methods.some((method) => parsed.methods.includes(method))) {
        return Number.NEGATIVE_INFINITY;
    }

    let score = 0;

    if (methods.length === 1 && parsed.methods.length === 1) {
        if (methods[0] === parsed.methods[0]) {
            score += 40;
        }
    }

    if (candidateUri === declaredUri) {
        score += 300;
    } else if (
        declaredUri.length > 0 &&
        candidateUri.endsWith(`/${declaredUri}`)
    ) {
        const extraPrefix = candidateUri.length - declaredUri.length;
        score += 220 - Math.min(extraPrefix, 120);
    } else if (
        declaredUri === "/" &&
        (candidateUri === "/" || candidateUri === "")
    ) {
        score += 250;
    } else {
        return Number.NEGATIVE_INFINITY;
    }

    if (route.filename) {
        const routeFile = normalizePath(route.filename);

        if (routeFile === documentPath) {
            score += 100;

            if (route.line) {
                const lineDiff = Math.abs(route.line - lineNumber - 1);

                if (lineDiff === 0) {
                    score += 1000;
                } else if (lineDiff <= 2) {
                    score += 200 - lineDiff * 50;
                }
            }
        }
    }

    return score;
};

const resolvePath = (routeUri: string) => {
    if (!routeUri || routeUri === "/") {
        return "/";
    }

    return routeUri.startsWith("/") ? routeUri : `/${routeUri}`;
};

export class RoutePathInlayHintsProvider implements vscode.InlayHintsProvider {
    provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
    ): vscode.ProviderResult<vscode.InlayHint[]> {
        if (!config("route.pathHints", true)) {
            return [];
        }

        if (!ROUTE_FILE_REGEX.test(document.fileName)) {
            return [];
        }

        const routes = getRoutes().items;

        if (routes.length === 0) {
            return [];
        }

        const hints: vscode.InlayHint[] = [];
        const documentPath = normalizePath(relativePath(document.fileName));
        const startLine = range.start.line;
        const endLine = range.end.line;

        for (let line = startLine; line <= endLine; line++) {
            const textLine = document.lineAt(line);
            const parsed = parseRouteLine(textLine.text);

            if (!parsed) {
                continue;
            }

            let bestRoute: (typeof routes)[number] | null = null;
            let bestScore = Number.NEGATIVE_INFINITY;

            for (const route of routes) {
                const score = scoreRouteMatch(
                    route,
                    parsed,
                    documentPath,
                    line,
                );

                if (score > bestScore) {
                    bestScore = score;
                    bestRoute = route;
                }
            }

            if (!bestRoute || bestScore <= 0) {
                continue;
            }

            const path = resolvePath(bestRoute.uri);
            const position = new vscode.Position(
                line,
                textLine.range.end.character,
            );
            const hint = new vscode.InlayHint(position, [
                {
                    value: ` ${path}`,
                    tooltip: "Click to copy route path",
                    command: {
                        title: "Copy route path",
                        command: copyRoutePathCommand,
                        arguments: [path],
                    },
                },
            ]);

            hint.kind = vscode.InlayHintKind.Type;
            hint.paddingLeft = true;

            hints.push(hint);
        }

        return hints;
    }
}
