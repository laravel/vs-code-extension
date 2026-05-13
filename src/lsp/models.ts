import { escapeNamespace } from "@src/support/util";
import { sendLspRequest } from "./client";

interface ModelItem {
    class: string;
}

type Models = Record<string, ModelItem>;

export const getModels = (): Promise<Models> => {
    return sendLspRequest<Models>("laravel/data", {
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
};
