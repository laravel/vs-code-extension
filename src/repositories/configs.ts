import { repository } from ".";
import { Config } from "..";
import { runInLaravel, template } from "../support/php";

interface ConfigGroupResult {
    configs: Config[];
    paths: string[];
}

export const getConfigPathByName = (match: string): string | undefined => {
    const filePath = match.replace(/\.[^.]+$/, '');

    for (const tryPath of [filePath.replaceAll('.', '/'), filePath.replace(/^([^.]+)\..*$/, '$1')]) {
        const configPath = getConfigs().items.paths.find((path) => {
            return !path.startsWith('vendor/') && path.endsWith(`${tryPath}.php`);
        });

        if (configPath) {
            return configPath;
        }
    }
};

export const getConfigs = repository<ConfigGroupResult>({
    load: () => {
        return runInLaravel<Config[]>(template("configs"), "Configs").then(
            (result) => {
                console.log('result', result);

                return {
                    configs: result.map((item) => {
                        return {
                            name: item.name,
                            value: item.value,
                            file: item.file,
                            line: item.line,
                        };
                    }),
                    paths: [...new Set(result.filter(item => typeof item.file === 'string').map(item => item.file))]
                } as ConfigGroupResult;
            }
        );
    },
    pattern: ["config/{,*,**/*}.php", ".env"],
    itemsDefault: {
        configs: [],
        paths: [],
    },
});
