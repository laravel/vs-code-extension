import { repository } from ".";
import { Model } from "..";
import { config } from "../support/config";
import { runInLaravel, template } from "./../support/php";

const modelPaths = config<string[]>("modelsPaths", ["app", "app/Models"]);

const load = () => {
    return runInLaravel<{
        [key: string]: Omit<Model, "fqn">;
    }>(
        template("eloquent-provider", {
            model_paths: JSON.stringify(modelPaths),
        }),
        "Eloquent Attributes and Relations",
    ).then((result) => {
        return Object.entries(result).map(([key, value]) => ({
            ...value,
            fqn: key,
        }));
    });
};

export const getModels = repository<Model[]>(
    load,
    modelPaths.concat(["database/migrations"]).map((path) => `${path}/*.php`),
    [],
);
