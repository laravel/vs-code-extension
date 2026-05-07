import { sendLspRequest } from "@src/lsp/client";
// import { runInLaravel } from "@src/support/php";
import { repository } from ".";

interface PathItem {
    key: string;
    path: string;
}

export const getPaths = repository<PathItem[]>({
    load: () => {
        return sendLspRequest<PathItem[]>("laravel/data", {
            name: "paths",
        });
    },
    pattern: "config/{,*,**/*}.php",
    itemsDefault: [],
    reloadOnComposerChanges: false,
});
