import { inAppDirs } from "@src/support/fileWatcher";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface RouteItem {
    method: string;
    uri: string;
    name: string;
    action: string;
    parameters: string[];
    filename: string | null;
    line: number | null;
}

const routesPattern = "{[Rr]oute}{,s}{.php,/*.php,/**/*.php}";

export const getRoutes = repository<RouteItem[]>(
    () => {
        return runInLaravel<RouteItem[]>(template("routes"), "HTTP Routes");
    },
    [inAppDirs(`{,**/}${routesPattern}`), routesPattern],
    [],
);
