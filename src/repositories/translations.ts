import { runInLaravel, template } from "@src/support/php";
import { projectPath } from "@src/support/project";
import { waitForValue } from "@src/support/util";
import { repository } from ".";

export interface TranslationItem {
    [key: string]: {
        value: string;
        path: string;
        line: number;
        params: string[];
    };
}

interface TranslationGroupResult {
    default: string;
    translations: {
        [key: string]: TranslationItem;
    };
    languages: string[];
    paths: string[];
}

interface TranslationGroupPhpResult {
    default: string;
    translations: {
        [key: string]: {
            [key: string]: [number, number, number, number | null];
        };
    };
    params: string[][];
    paths: string[];
    values: string[];
    to_watch: string[];
    languages: string[];
}

interface TranslationPath {
    path: string;
    line?: number;
}

let dirsToWatch: string[] | null = null;

const load = () => {
    return runInLaravel<TranslationGroupPhpResult>(
        template("translations"),
        "Translations",
    ).then((res) => {
        const result: TranslationGroupResult["translations"] = {};

        Object.entries(res.translations).forEach(
            ([namespace, translations]) => {
                result[namespace] = {};

                Object.entries(translations).forEach(([key, value]) => {
                    const [v, p, li, pa] = value;

                    result[namespace][key] = {
                        value: res.values[v],
                        path: projectPath(res.paths[p]),
                        line: li,
                        params: pa === null ? [] : res.params[pa],
                    };
                });
            },
        );

        dirsToWatch = res.to_watch;

        return {
            default: res.default,
            translations: result,
            languages: res.languages,
            paths: res.paths,
        };
    });
};

export const getTranslationItemByName = (
    match: string,
): TranslationItem | undefined => {
    return getTranslations().items.translations[match.replaceAll("\\", "")];
};

export const getParentTranslationItemByName = (
    match: string,
): TranslationItem | undefined => {
    const name = match.match(/^(.*)\./)?.[0];

    if (!name) {
        return undefined;
    }

    const parentName = Object.keys(getTranslations().items.translations).find(
        (key) => key.startsWith(name.replaceAll("\\", "")),
    );

    return parentName ? getTranslationItemByName(parentName) : undefined;
};

export const getTranslationPathByName = (
    match: string,
    lang: string | undefined,
): TranslationPath | undefined => {
    lang = lang ?? getTranslations().items.default;

    // Firstly, we try to get the parent TranslationItem, because it has a path and a line
    const parentItem = getParentTranslationItemByName(match);

    let path = parentItem?.[lang]?.path;

    // If the path is not found (because, for example, translation file is empty),
    // we try to find the path by the file name
    if (!path) {
        const fileName = match
            .replace(/^.*::/, "")
            .replace(/^([^.]+)\..*$/, "$1");

        path = getTranslations().items.paths.find((path) => {
            return (
                !path.startsWith("vendor/") &&
                path.endsWith(`${lang}/${fileName}.php`)
            );
        });

        if (path) {
            path = projectPath(path);
        }
    }

    return path
        ? {
              path: path,
              line: parentItem?.[lang]?.line,
          }
        : undefined;
};

export const getTranslations = repository<TranslationGroupResult>({
    load,
    pattern: () =>
        waitForValue(() => dirsToWatch).then((value) => {
            if (value === null || value.length === 0) {
                return null;
            }

            return `{${value.join(",")}}/{*,**/*}`;
        }),
    itemsDefault: {
        default: "",
        translations: {},
        languages: [],
        paths: [],
    },
});
