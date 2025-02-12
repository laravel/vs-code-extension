import { repository } from ".";
import { runInLaravel, template } from "./../support/php";

type AuthItems = {
    [key: string]: AuthItem[];
};

export type AuthItem = {
    policy: string | null;
    uri: string;
    line: number;
    model: string | null;
};

const load = () => {
    return runInLaravel<AuthItems>(template("auth"), "Auth Data");
};

export const getPolicies = repository<AuthItems>(
    load,
    "app/Providers/{,*,**/*}.php",
    {},
);
