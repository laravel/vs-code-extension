import { projectPath } from "@src/support/project";
import { repository } from ".";
import { Config } from "..";
import { runInLaravel, template } from "../support/php";

interface ConfigGroupResult {
    configs: Config[];
    paths: string[];
}

interface ConfigPath {
    path: string;
    line?: string | null;
}

export const getConfigByName = (name: string): Config | undefined => {
    return getConfigs().items.configs.find((item) => item.name === name);
};

export const getParentConfigByName = (match: string): Config | undefined => {
    const name = match.match(/^(.+\..+)\./)?.[0];

    if (!name) {
        return undefined;
    }

    return getConfigs().items.configs.find((config) =>
        new RegExp(`^${name}[^.]*$`).test(config.name),
    );
};

export const getConfigPathByName = (match: string): ConfigPath | undefined => {
    // Firstly, we try to get the parent Config, because it has a path and a line
    const parentItem = getParentConfigByName(match);

    let path = parentItem?.file;

    // If the path is not found (because, for example, config file is empty),
    // we try to find the path by the file name
    if (!path) {
        const fileName = match.replace(/\.[^.]+$/, "");

        // We have to check every possible subfolder, for example: foo.bar.baz.example
        // can be: foo/bar.php with a key "baz.example" but also foo/bar/baz.php with a key "example"
        const parts = fileName.split(".");
        const subfolderPaths = parts
            .slice(1)
            .map((_, i) =>
                (
                    parts.slice(0, i + 2).join("/") +
                    "." +
                    parts.slice(i + 2).join(".")
                ).replace(/^([^.]+)\..*$/, "$1"),
            )
            .reverse();

        for (const tryPath of [
            ...subfolderPaths,
            fileName.replace(/^([^.]+)\..*$/, "$1"),
        ]) {
            path = getConfigs().items.paths.find((path) => {
                return (
                    !path.startsWith("vendor/") &&
                    path.endsWith(`${tryPath}.php`)
                );
            });

            if (path) {
                break;
            }
        }
    }

    return path
        ? {
              path: projectPath(path),
              line: parentItem?.line,
          }
        : undefined;
};

export const getConfigs = repository<ConfigGroupResult>({
    load: () => {
        return runInLaravel<Config[]>(template("configs"), "Configs").then(
            (result) => {
                return {
                    configs: result.map((item) => {
                        return {
                            name: item.name,
                            value: item.value,
                            file: item.file,
                            line: item.line,
                        };
                    }),
                    paths: [
                        ...new Set(
                            result
                                .filter((item) => typeof item.file === "string")
                                .map((item) => item.file),
                        ),
                    ],
                } as ConfigGroupResult;
            },
        );
    },
    pattern: ["config/{,*,**/*}.php", ".env"],
    itemsDefault: {
        configs: [],
        paths: [],
    },
});
