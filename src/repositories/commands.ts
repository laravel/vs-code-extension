import { inAppDirs } from "@src/support/fileWatcher";
import { repository } from ".";
import { runInLaravel, template } from "../support/php";

export interface CommandItem {
    name: string;
    class: string;
    description: string;
    path: string | null;
    line: number | null;
}

const commandsPattern = "[Cc]ommands/{,**/}*.php";

export const getCommands = repository<CommandItem[]>({
    load: () => {
        return runInLaravel<CommandItem[]>(
            template("commands"),
            "Artisan Commands",
        );
    },
    pattern: [
        inAppDirs(`{,**/}${commandsPattern}`),
        commandsPattern,
        "routes/console.php",
    ],
    itemsDefault: [],
});
