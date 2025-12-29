import { repository } from ".";
import { Config } from "..";
import { runInLaravel, template } from "../support/php";

interface ConfigGroupResult {
    configs: Config[];
    paths: string[];
}

export const getConfigByName = (name: string): Config | undefined => {
    return getConfigs().items.configs.find((item) => item.name === name);
};

export const getPreviousConfigByName = (match: string): Config | undefined => {
    const name = match.match(/^(.+)\./)?.[0];

    if (!name) {
        return undefined;
    }

    return getConfigs().items.configs.find((config) =>
        new RegExp(`^${name}[^.]*$`).test(config.name),
    );
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
