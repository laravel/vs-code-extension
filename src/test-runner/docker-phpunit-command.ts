import * as vscode from "vscode";
import RemotePhpUnitCommand from "./remote-phpunit-command";

export default class DockerPhpUnitCommand extends RemotePhpUnitCommand {
    get paths(): {
        [localPath: string]: string;
    } {
        return this.config.get("docker.paths") || {};
    }

    get dockerCommand() {
        if (this.config.get("docker.command")) {
            return this.config.get("docker.command");
        }

        const msg =
            "No laravel.docker.command was specified in the settings";
        vscode.window.showErrorMessage(msg);

        throw msg;
    }

    wrapCommand(command: string) {
        if (
            vscode.workspace
                .getConfiguration("laravel")
                .get("ssh.enable")
        ) {
            return super.wrapCommand(`${this.dockerCommand} ${command}`);
        }
        return `${this.dockerCommand} ${command}`;
    }
}
