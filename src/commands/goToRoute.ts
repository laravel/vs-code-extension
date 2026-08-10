import { getRoutes, type RouteItem } from "@src/lsp/routes";
import { getViews, type ViewItem } from "@src/lsp/views";
import { getLaravelWorkspaceFolders, projectPath } from "@src/support/project";
import * as vscode from "vscode";
import { commandName } from ".";

type WorkspaceQuickPickItem = vscode.QuickPickItem & {
    workspaceFolder: vscode.WorkspaceFolder;
};

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
    const selectedWorkspaceFolder = await selectWorkspaceFolder();

    const routes = await loadRoutes(selectedWorkspaceFolder?.workspaceFolder);

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
        (await resolveLivewireRouteTarget(
            selected.route,
            selectedWorkspaceFolder?.workspaceFolder,
        )) ??
        (await resolveRouteTarget(
            selected.route,
            selectedWorkspaceFolder?.workspaceFolder,
        ));

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

const selectWorkspaceFolder = async (): Promise<
    WorkspaceQuickPickItem | undefined
> => {
    const workspaceFolders = getLaravelWorkspaceFolders();

    if (workspaceFolders.length <= 1) {
        return undefined;
    }

    return await vscode.window.showQuickPick(
        buildWorkspaceFolderQuickPickItems(workspaceFolders),
        {
            title: "Laravel: Go to Route",
            matchOnDescription: false,
            matchOnDetail: false,
            placeHolder: "Select a workspace folder to load routes from",
        },
    );
};

export const formatRouteLabel = (route: RouteItem): string => {
    return `${route.method} ${route.uri} | ${route.name || unnamedRouteLabel}`;
};

const buildWorkspaceFolderQuickPickItems = (
    workspaceFolders: vscode.WorkspaceFolder[],
): WorkspaceQuickPickItem[] =>
    workspaceFolders.map((workspaceFolder) => ({
        label: workspaceFolder.name,
        workspaceFolder,
    }));

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

const loadRoutes = async (
    workspaceFolder?: vscode.WorkspaceFolder,
): Promise<RouteItem[]> => {
    return await getRoutes(workspaceFolder);
};

const loadViews = async (
    workspaceFolder?: vscode.WorkspaceFolder,
): Promise<ViewItem[]> => {
    return await getViews(workspaceFolder);
};

const resolveRouteTarget = async (
    route: RouteItem,
    workspaceFolder?: vscode.WorkspaceFolder,
): Promise<RouteTarget | null> => {
    if (!route.filename) {
        return null;
    }

    return {
        uri: vscode.Uri.file(projectPath(route.filename, workspaceFolder)),
        line: Math.max((route.line ?? 1) - 1, 0),
        position: 0,
    };
};

const resolveLivewireRouteTarget = async (
    route: RouteItem,
    workspaceFolder?: vscode.WorkspaceFolder,
): Promise<RouteTarget | null> => {
    if (!route.livewire) {
        return null;
    }

    const view = (await loadViews(workspaceFolder)).find(
        (item) => item.key === route.livewire,
    );

    if (!view) {
        return null;
    }

    return {
        uri: vscode.Uri.file(projectPath(view.path, workspaceFolder)),
        line: 0,
        position: 0,
    };
};
