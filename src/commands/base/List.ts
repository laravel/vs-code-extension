import Common from "../../Common";

export default class List extends Common {
    public static async run() {
        let command = `list --format=json`;
        // Generate the controller
        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError("Could not get the list", info.err);
            } else {
                let list: {
                    commands: {
                        definition: {
                            arguments: {
                                name: {
                                    name: string;
                                    description: string;
                                    is_required: boolean;
                                };
                            };
                            options: {};
                        };
                        description: string;
                        help: string;
                        name: string;
                        usage: string[];
                    }[];
                } = JSON.parse(info.stdout || "{}");
                let headers: string[] = [];
                let rows: string[][] = [];

                headers.push("Name", "Description", "Arguments", "Options");

                let i = 0;
                list.commands.forEach((command) => {
                    let row: string[] = (rows[i] = []);
                    row.push(command.name);
                    row.push(command.description);
                    if (command.definition.arguments.name) {
                        let name = command.definition.arguments.name;
                        row.push(
                            name.name +
                                (name.is_required ? "" : " (Optional) ") +
                                " &ndash; " +
                                name.description,
                        );
                    } else {
                        row.push("");
                    }
                    let opts: string[] = [];
                    for (let i in command.definition.options) {
                        if (
                            [
                                "help",
                                "quiet",
                                "version",
                                "ansi",
                                "no-ansi",
                                "no-interaction",
                                "env",
                                "verbose",
                            ].indexOf(i) > -1
                        ) {
                            continue;
                        }
                        // @ts-ignore
                        let name: string = command.definition.options[i].name;
                        let descr: string =
                            // @ts-ignore
                            command.definition.options[i].description;
                        opts.push(name + " &ndash; " + descr);
                    }
                    row.push(opts.join("<br>"));
                    i++;
                });
                this.openVirtualHtmlFile(
                    "artisan-list",
                    "Artisan Commands",
                    headers,
                    rows,
                    info.artisan.dir,
                );
            }
        });
    }
}
