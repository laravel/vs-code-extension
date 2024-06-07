import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface MiddlewareItem {
    [key: string]: string | null;
}

export const getMiddleware = repository<MiddlewareItem>(
    () => {
        return runInLaravel<MiddlewareItem>(
            template("middleware"),
            "Middlewares",
        );
    },
    "app/Http/Kernel.php",
    {},
    ["change"],
);
