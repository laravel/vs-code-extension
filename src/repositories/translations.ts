import { Uri } from "vscode";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

interface TranslationItem {
    [key: string]: {
        [key: string]: {
            value: string;
            uri: Uri;
            params: string[];
        };
    };
}

interface TranslationGroupResult {
    [key: string]: {
        [key: string]: {
            value: string;
            path: string;
            line: number;
            params: string[];
        };
    };
}

const load = () => {
    return runInLaravel<TranslationGroupResult>(
        template("translations"),
        "Translation namespaces",
    );
};

export const getTranslations = repository<TranslationGroupResult>(
    load,
    "{,**/}{lang,localization,localizations,trans,translation,translations}/{*,**/*}",
    {},
);
