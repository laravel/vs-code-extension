import { inAppDirs } from "@src/support/fileWatcher";
import * as fs from "fs";
import { repository } from ".";
import { projectPath } from "../support/project";

const load = (): string[] => {
    return collectControllers(projectPath("app/Http/Controllers")).map(
        (controller) => controller.replace(/@__invoke/, ""),
    );
};

const collectControllers = (path: string): string[] => {
    let controllers = new Set<string>();

    if (path.substring(-1) !== "/" && path.substring(-1) !== "\\") {
        path += "/";
    }

    if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
        return [...controllers];
    }

    fs.readdirSync(path).forEach((file) => {
        const fullPath = path + file;

        if (fs.lstatSync(fullPath).isDirectory()) {
            collectControllers(fullPath + "/").forEach((controller) => {
                controllers.add(controller);
            });

            return;
        }

        if (!file.includes(".php")) {
            return;
        }

        const controllerContent = fs.readFileSync(fullPath, "utf8");

        if (controllerContent.length > 50_000) {
            // TODO: Hm, yeah?
            return;
        }

        let match = /class\s+([A-Za-z0-9_]+)\s+extends\s+.+/g.exec(
            controllerContent,
        );

        const matchNamespace =
            /namespace .+\\Http\\Controllers\\?([A-Za-z0-9_]*)/g.exec(
                controllerContent,
            );

        if (match === null || !matchNamespace) {
            return;
        }

        const functionRegex = /public\s+function\s+([A-Za-z0-9_]+)\(.*\)/g;

        let className = match[1];
        let namespace = matchNamespace[1];

        while (
            (match = functionRegex.exec(controllerContent)) !== null &&
            match[1] !== "__construct"
        ) {
            if (namespace.length > 0) {
                controllers.add(`${namespace}\\${className}@${match[1]}`);
            }

            controllers.add(`${className}@${match[1]}`);
        }
    });

    return [...controllers];
};

export const getControllers = repository<string[]>({
    load: () => {
        return new Promise((resolve) => {
            resolve(load());
        });
    },
    pattern: inAppDirs("{,**/}{Controllers}{.php,/*.php,/**/*.php}"),
    itemsDefault: [],
});
