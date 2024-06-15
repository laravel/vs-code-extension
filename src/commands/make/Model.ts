import * as fs from "fs";
import Common from "../../Common";

export default class MakeModel extends Common {
    public static async run() {
        // Get the name of the controller to create
        let modelName = await this.getInput("Model Name");
        if (modelName.length === 0) {
            this.showError("A model name is required");
            return;
        }
        let isController = false;
        let isMigration = false;
        let isResource = false;
        let isFactory = false;
        let isAll = false;

        // Determine if should we create migration,factory and resource controller
        isAll = await this.getYesNo(
            "Should I create a migration, factory and resource controller for the model?",
        );

        if (!isAll) {
            // Determine if we should create a migration or not
            isMigration = await this.getYesNo(
                "Should I create a migration for the model?",
            );

            // Determine if it should create a factory for this model or not
            isFactory = await this.getYesNo(
                "Should I create a factory for the model?",
            );

            // Should a controller be generated?
            isController = await this.getYesNo(
                "Should I create a controller for the model?",
            );

            // Ask if the controller is a resource if the previous answer was 'yes'
            if (isController) {
                // Determine if this is a resource controller or not
                isResource = await this.getYesNo(
                    "Should I create the controller as a resource?",
                );
            }
        }

        let command = `make:model ${modelName} ${isMigration ? "-m" : ""} ${
            isFactory ? "-f" : ""
        } ${isController ? "-c" : ""} ${isResource ? "-r" : ""} ${
            isAll ? "-a" : ""
        }`;

        // Generate the model
        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError("Could not create the model", info.err);
            } else {
                if (
                    fs.existsSync(
                        info.artisan.dir + "/app/Models/" + modelName + ".php",
                    )
                ) {
                    await this.openFile(
                        info.artisan.dir,
                        "/app/Models/" + modelName + ".php",
                    );
                } else {
                    await this.openFile(
                        info.artisan.dir,
                        "/app/" + modelName + ".php",
                    );
                }
                if (isController || isAll) {
                    await this.openFile(
                        info.artisan.dir,
                        "/app/Http/Controllers/" + modelName + "Controller.php",
                    );
                }
                if (isFactory || isAll) {
                    await this.openFile(
                        info.artisan.dir,
                        "/database/factories/" + modelName + "Factory.php",
                    );
                }
                if (isMigration || isAll) {
                    // @ts-ignore
                    let migration = info.stdout
                        .match(/Created Migration:(.+)/im)[1]
                        .trim();
                    await this.openFile(
                        info.artisan.dir,
                        "/database/migrations/" + migration + ".php",
                    );
                }
            }
        });
    }
}
