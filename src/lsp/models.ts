import { Eloquent } from "..";
import { escapeNamespace } from "@src/support/util";
import { sendLspRequest } from "./client";

export const getModels = (): Promise<Eloquent.Models> => {
    return sendLspRequest<Eloquent.Models>("laravel/data", {
        name: "models",
    });
};

export const getModelClassnames = async (): Promise<Record<string, string>> => {
    return Object.fromEntries(
        Object.values(await getModels()).map((model) => [
            model.class,
            escapeNamespace(model.class),
        ]),
    );
