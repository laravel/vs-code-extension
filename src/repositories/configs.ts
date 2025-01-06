import { repository } from ".";
import { Config } from "..";
import { runInLaravel, template } from "../support/php";

export const getConfigs = repository<Config[]>(
    () => {
        return runInLaravel<Config[]>(template("configs"), "Configs").then(
            (result) =>
                result.map((item) => {
                    return {
                        name: item.name,
                        value: item.value,
                        file: item.file,
                        line: item.line,
                    };
                }),
        );
    },
    ["config/{,*,**/*}.php", ".env"],
    [],
);
