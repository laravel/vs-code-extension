import Common from "../../Common";

export default class KeyGenerate extends Common {
    public static async run() {
        let update = await this.getYesNo("Should I update the env file?");
        let command = `key:generate ${!update ? "--show" : ""}`;

        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError("The key could not be generated", info.err);
            } else {
                // @ts-ignore
                let key = info.stdout.match(/base64:([^\] \b]*)/gi)[0] || "";
                if (update && key.length > 0) {
                    this.showMessage("The key was generated (" + key + ")");
                } else if (!update && key.length > 0) {
                    this.showMessage("Here is a key: (" + key + ")");
                } else {
                    this.showError("A key was not generated");
                }
            }
        });
    }
}
