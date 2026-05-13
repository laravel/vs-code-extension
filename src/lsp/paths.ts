import { sendLspRequest } from "./client";

export interface PathItem {
    key: string;
    path: string;
}

export const getPaths = (): Promise<PathItem[]> => {
    return sendLspRequest<PathItem[]>("laravel/data", {
        name: "paths",
    });
};
