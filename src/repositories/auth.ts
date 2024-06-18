import { repository } from ".";
import { runInLaravel, template } from "./../support/php";

interface AuthItems {
    [key: string]: AuthItem[];
}

interface AuthItem {
    key: string;
    policy_class: string | null;
    uri: string;
    lineNumber: number;
}

const load = () => {
    return runInLaravel<AuthItems>(template("auth"), "Auth Data");
};

export const getPolicies = repository<AuthItems>(
    load,
    "app/Providers/{,*,**/*}.php",
    {},
);
