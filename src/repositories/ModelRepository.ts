import { Model } from "..";
import { config } from "../support/config";
import { runInLaravel, template } from "./../PHP";
import { createFileWatcher } from "./../support/fileWatcher";

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

modelPaths
    .concat(["database/migrations"])
    .forEach((path) => createFileWatcher(`${path}/*.php`, load));

load();

const getModels = (): Model[] => models;

export default getModels;
