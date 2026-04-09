import { getRoutes, type RouteItem } from "@src/repositories/routes";
import { getViews, type ViewItem } from "@src/repositories/views";
import { projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { commandName } from ".";

type RouteQuickPickItem = vscode.QuickPickItem & {
    route: RouteItem;
};

type RouteTarget = {
    uri: vscode.Uri;
    line: number;
    position: number;
};

const unnamedRouteLabel = "(unnamed)";

export const goToRouteCommand = async () => {
    const routes = await loadRoutes();

    if (routes.length === 0) {
        vscode.window.showWarningMessage("No Laravel routes found.");
        return;
    }

    const selected = await vscode.window.showQuickPick(
        buildRouteQuickPickItems(routes),
        {
            title: "Laravel: Go to Route",
            matchOnDescription: false,
            matchOnDetail: false,
            placeHolder: "Select a route to open its handler",
        },
    );

    if (!selected) {
        return;
    }

    const target =
        (await resolveLivewireRouteTarget(selected.route)) ??
        (await resolveRouteTarget(selected.route));

    if (!target) {
        vscode.window.showWarningMessage(
            `Could not resolve a handler for route '${selected.route.name || selected.route.uri}'.`,
        );
        return;
    }

    await vscode.commands.executeCommand(
        commandName("laravel.open"),
        target.uri,
        target.line,
        target.position,
    );
};

export const formatRouteLabel = (route: RouteItem): string => {
    return `${route.method} ${route.uri} | ${route.name || unnamedRouteLabel}`;
};

export const buildRouteQuickPickItems = (
    routes: RouteItem[],
): RouteQuickPickItem[] => {
    return [...routes]
        .sort((left, right) => {
            return formatRouteLabel(left).localeCompare(
                formatRouteLabel(right),
            );
        })
        .map((route) => ({
            label: formatRouteLabel(route),
            route,
        }));
};

const loadRoutes = async (): Promise<RouteItem[]> => {
    const repository = getRoutes();

    if (repository.loaded) {
        return repository.items;
    }

    return (await repository.whenLoaded((items) => items)) ?? [];
};

const loadViews = async (): Promise<ViewItem[]> => {
    const repository = getViews();

    if (repository.loaded) {
        return repository.items;
    }

    return (await repository.whenLoaded((items) => items)) ?? [];
};

const resolveRouteTarget = async (
    route: RouteItem,
): Promise<RouteTarget | null> => {
    if (!route.filename) {
        return null;
    }

    return {
        uri: vscode.Uri.file(projectPath(route.filename)),
        line: Math.max((route.line ?? 1) - 1, 0),
        position: 0,
    };
};

const resolveLivewireRouteTarget = async (
    route: RouteItem,
): Promise<RouteTarget | null> => {
    if (!route.livewire) {
        return null;
    }

    const view = (await loadViews()).find(
        (item) => item.key === route.livewire,
    );

    if (!view) {
        return null;
    }

    return {
        uri: vscode.Uri.file(projectPath(view.path)),
        line: 0,
        position: 0,
    };
};
