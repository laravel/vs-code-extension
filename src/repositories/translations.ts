import { runInLaravel, template } from "@src/support/php";
import { projectPath } from "@src/support/project";
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
}

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

        return {
            default: res.default,
            translations: result,
        };
    });
};

export const getTranslations = repository<TranslationGroupResult>(
    load,
    "{,**/}{lang,localization,localizations,trans,translation,translations}/{*,**/*}",
    {
        default: "",
        translations: {},
    },
);
