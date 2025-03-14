import { internalVendorPath } from "@src/support/project";
import fs from "fs";
import { repository } from ".";
import { runInLaravel, template } from "./../support/php";

type AuthItems = {
    authenticatable: string | null;
    policies: {
        [key: string]: AuthItem[];
    };
};

export type AuthItem = {
    policy: string | null;
    uri: string;
    line: number;
    model: string | null;
};

const writeAuthBlocks = (authenticatable: string | null) => {
    if (!authenticatable) {
        return;
    }

    const blocks = [
        {
            file: "_auth.php",
            content: `
<?php

namespace Illuminate\\Contracts\\Auth;

interface Guard
{
    /**
     * @return ${authenticatable}|null
     */
    public function user();
}`,
        },
        {
            file: "_request.php",
            content: `
<?php

namespace Illuminate\\Http;

interface Request
{
    /**
     * @return ${authenticatable}|null
     */
    public function user();
}`,
        },
    ];

    blocks.forEach((block) => {
        fs.writeFileSync(internalVendorPath(block.file), block.content.trim());
    });
};

const load = () => {
    return runInLaravel<AuthItems>(template("auth"), "Auth Data").then(
        (result) => {
            writeAuthBlocks(result.authenticatable);

            return result;
        },
    );
};

export const getPolicies = repository<AuthItems>({
    load,
    pattern: "app/Providers/{,*,**/*}.php",
    itemsDefault: {
        authenticatable: null,
        policies: {},
    },
});
