import { sendLspRequest } from "./client";

export interface RouteItem {
    method: string;
    uri: string;
    name: string;
    action: string;
    parameters: string[];
    filename: string | null;
    line: number | null;
    livewire: string | null;
}

export const getRoutes = (): Promise<RouteItem[]> => {
    return sendLspRequest<RouteItem[]>("laravel/data", {
        name: "routes",
    });
};
