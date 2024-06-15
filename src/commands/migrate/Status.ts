import Common from "../../Common";

export default class MigrateStatus extends Common {
    public static async run() {
        let database = await this.getInput("What database should I use?");
        let command = `migrate:status ${
            database.length > 0 ? "--database=" + database : ""
        }`;

        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError(
                    "Could not get the status of the migrations",
                    info.err,
                );
            } else {
                let data = this.parseCliTable(info.stdout || "");
                this.openVirtualHtmlFile(
                    "migrate-status",
                    "Migrate Status",
                    data.headers,
                    data.rows,
                    info.artisan.dir,
                );
            }
        });
    }
}
