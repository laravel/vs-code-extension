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
            [key: string]: {
                v: string;
                p: string;
                li: number;
                pa: string[];
            };
        };
    };
}

const load = () => {
    return runInLaravel<TranslationGroupPhpResult>(
        template("translations"),
        "Translation namespaces",
    ).then((res) => {
        const result: TranslationGroupResult["translations"] = {};

        Object.entries(res.translations).forEach(
            ([namespace, translations]) => {
                result[namespace] = {};
                Object.entries(translations).forEach(([key, value]) => {
                    result[namespace][key] = {
                        value: value.v,
                        path: projectPath(value.p),
                        line: value.li,
                        params: value.pa,
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
