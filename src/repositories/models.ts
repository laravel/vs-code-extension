import { Model } from "..";
import { config } from "../support/config";
import { loadAndWatch } from "./../support/fileWatcher";
import { runInLaravel, template } from "./../support/php";

let models: Model[] = [];

const modelPaths = config<string[]>("modelsPaths", ["app", "app/Models"]);

const load = () => {
    runInLaravel<{
        [key: string]: Omit<Model, "fqn">;
    }>(
        template("eloquent-provider", {
            model_paths: JSON.stringify(modelPaths),
        }),
        "Eloquent Attributes and Relations",
    )
        .then((result) => {
            models = Object.entries(result).map(([key, value]) => ({
                ...value,
                fqn: key,
            }));
        })
        .catch(function (e) {
            console.error(e);
        });
};

loadAndWatch(
    load,
    modelPaths.concat(["database/migrations"]).map((path) => `${path}/*.php`),
    ["create", "delete"],
);

export const getModels = (): Model[] => models;
