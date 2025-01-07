import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface MiddlewareItem {
    [key: string]: {
        class: string | null;
        path: string | null;
        line: number | null;
        parameters: string | null;
        groups: {
            class: string;
            path: string | null;
            line: number | null;
        }[];
    };
}

export const getMiddleware = repository<MiddlewareItem>(
    () => {
        return runInLaravel<MiddlewareItem>(
            template("middleware"),
            "Middlewares",
        ).then((result) => {
            const items: MiddlewareItem = {};

            for (let key in result) {
                items[key] = {
                    class: result[key].class,
                    path: result[key].path,
                    line: result[key].line,
                    parameters: result[key].parameters,
                    groups: result[key].groups.map((group) => ({
                        class: group.class,
                        path: group.path,
                        line: group.line,
                    })),
                };
            }

            return items;
        });
    },
    "app/Http/Kernel.php",
    {},
    ["change"],
);
