import Common from "../../Common";

export default class MakeMigration extends Common {
    public static async run() {
        // Get the name of the controller to create
        let migrationName = await this.getInput("Migration Name");
        if (migrationName.length === 0) {
            this.showError("A migration name is required");
            return;
        }

        let createTable = false;
        let modifyTable = false;
        let tableName = "";

        // Determine if this is a resource controller or not
        createTable = await this.getYesNo(
            "Will this migration create a table?",
        );
        if (!createTable) {
            modifyTable = await this.getYesNo(
                "Will this migration modify an existing table?",
            );
        }

        if (createTable || modifyTable) {
            tableName = await this.getInput("What is the name of the table?");
        }

        let command = `make:migration "${migrationName}" ${
            createTable ? "--create=" + tableName : ""
        } ${modifyTable ? "--table=" + tableName : ""}`;

        // Generate the controller
        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError("Could not create the migration", info.err);
            } else {
                // @ts-ignore
                let file = info.stdout.replace(/^.+:/gi, "").trim();
                await this.openFile(
                    info.artisan.dir,
                    "/database/migrations/" + file + ".php",
                );
            }
        });
    }
}
