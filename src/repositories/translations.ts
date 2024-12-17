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
    [key: string]: TranslationItem;
}

interface TranslationGroupPhpResult {
    [key: string]: {
        [key: string]: {
            v: string;
            p: string;
            li: number;
            pa: string[];
        };
    };
}

const load = () => {
    return runInLaravel<TranslationGroupPhpResult>(
        template("translations"),
        "Translation namespaces",
    ).then((res) => {
        const result: TranslationGroupResult = {};

        Object.entries(res).forEach(([namespace, translations]) => {
            result[namespace] = {};
            Object.entries(translations).forEach(([key, value]) => {
                result[namespace][key] = {
                    value: value.v,
                    path: projectPath(value.p),
                    line: value.li,
                    params: value.pa,
                };
            });
        });

        return result;
    });
};

export const getTranslations = repository<TranslationGroupResult>(
    load,
    "{,**/}{lang,localization,localizations,trans,translation,translations}/{*,**/*}",
    {},
);
