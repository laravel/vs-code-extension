import Common from "../../Common";

export default class ClearCompiled extends Common {
    public static async run() {
        let command = `clear-compiled`;
        // Generate the controller
        this.execCmd(command, async (info) => {
            if (info.err) {
                this.showError("Compilation was not cleared", info.err);
            } else {
                this.showMessage("Compilation cleared");
            }
        });
    }
}
