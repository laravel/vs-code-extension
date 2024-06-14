import { repository } from ".";
import { Eloquent } from "..";
import { config } from "../support/config";
import { runInLaravel, template } from "./../support/php";

const modelPaths = config<string[]>("modelsPaths", ["app", "app/Models"]);

const load = () => {
    return runInLaravel<Eloquent.Models>(
        template("eloquent-provider", {
            model_paths: JSON.stringify(modelPaths),
        }),
        "Eloquent Attributes and Relations",
    );
};

export const getModels = repository<Eloquent.Models>(
    load,
    modelPaths.concat(["database/migrations"]).map((path) => `${path}/*.php`),
    {},
);
