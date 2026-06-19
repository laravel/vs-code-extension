import { internalVendorPath } from "@src/support/project";
import fs from "fs";
import * as vscode from "vscode";
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

const writeAuthBlocks = (
    authenticatable: string | null,
    workspaceFolder: vscode.WorkspaceFolder,
) => {
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
    public function user($guard = null);
}`,
        },
        {
            file: "_facade.php",
            content: `
<?php

namespace Illuminate\\Support\\Facades;

interface Auth
{
    /**
     * @return ${authenticatable}|false
     */
    public static function loginUsingId(mixed $id, bool $remember = false);

    /**
     * @return ${authenticatable}|false
     */
    public static function onceUsingId(mixed $id);

    /**
     * @return ${authenticatable}|null
     */
    public static function getUser();

    /**
     * @return ${authenticatable}
     */
    public static function authenticate();

    /**
     * @return ${authenticatable}|null
     */
    public static function user();

    /**
     * @return ${authenticatable}|null
     */
    public static function logoutOtherDevices(string $password);

    /**
     * @return ${authenticatable}
     */
    public static function getLastAttempted();
}`,
        },
    ];

    blocks.forEach((block) => {
        fs.writeFileSync(
            internalVendorPath(block.file, workspaceFolder),
            block.content.trim(),
        );
    });
};

const load = (workspaceFolder: vscode.WorkspaceFolder) => {
    return runInLaravel<AuthItems>(
        template("auth"),
        workspaceFolder,
        "Auth Data",
    ).then((result) => {
        writeAuthBlocks(result.authenticatable, workspaceFolder);

        return result;
    });
};

export const getPolicies = repository<AuthItems>({
    load,
    pattern: "app/Providers/{,*,**/*}.php",
    itemsDefault: {
        authenticatable: null,
        policies: {},
    },
});
