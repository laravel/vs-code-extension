import { config } from "../support/config";

export const getPhpCommand = (): string[] => {
    const command = config<string[]>("lspPhpCommand", []);

    return command.length > 0 ? command : ["php"];
};
