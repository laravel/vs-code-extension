import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import PhpUnitCommand from "./phpunit-command";

export default class RemotePhpUnitCommand extends PhpUnitCommand {
    protected config: vscode.WorkspaceConfiguration;

    constructor(
        options: {
            runFullSuite?: boolean;
            runFile?: boolean;
            subDirectory?: string;
        } = {},
    ) {
        super(options);

        this.config = vscode.workspace.getConfiguration("laravel");
    }

    get file() {
        return this.remapLocalPath(super.file);
    }

    get binary() {
        return this.remapLocalPath(super.binary);
    }

    get output() {
        return this.wrapCommand(super.output);
    }

    get configuration() {
        return this.subDirectory
            ? " --configuration " +
                  this.remapLocalPath(
                      this._normalizePath(
                          path.join(this.subDirectory, "phpunit.xml"),
                      ),
                  )
            : "";
    }

    get paths(): {
        [localPath: string]: string;
    } {
        return this.config.get("ssh.paths") || {};
    }

    get sshBinary() {
        if (this.config.get("ssh.binary")) {
            return this.config.get("ssh.binary");
        }

        return "ssh";
    }

    remapLocalPath(actualPath: string) {
        for (const [localPath, remotePath] of Object.entries(this.paths)) {
            const expandedLocalPath = localPath.replace(/^~/, os.homedir());
            if (actualPath.startsWith(expandedLocalPath)) {
                return actualPath.replace(expandedLocalPath, remotePath);
            }
        }

        return actualPath;
    }

    wrapCommand(command: string) {
        const user = this.config.get("ssh.user");
        const port = this.config.get("ssh.port");
        const host = this.config.get("ssh.host");
        let options = this.config.get("ssh.options");
        let disableOptions = this.config.get("ssh.disableAllOptions");
        let optionsString = "";

        if (!disableOptions) {
            if (!options) {
                options = `-tt -p${port}`;
            }
            optionsString = options + ` ${user}@${host} `;
        }

        return `${this.sshBinary} ${optionsString}"${command}"`;
    }
}
