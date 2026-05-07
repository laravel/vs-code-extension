import os from "os";
import { sendLspRequest } from "@src/lsp/client";
import { getCommandTemplate } from "./php";

export const debugInfo: Record<string, string> = {};

export const collectDebugInfo = () => {
    debugInfo["os"] = os.platform();
    debugInfo["arch"] = os.arch();

    sendLspRequest<Record<string, string>>("laravel/data", {
        name: "debugInfo",
    }).then((output) => {
        if (output) {
            for (const key in output as Record<string, string>) {
                // @ts-ignore
                debugInfo[key] = output[key];
            }
        }
    }).catch((error) => {
        console.error(error);
    }).finally(() => {
        debugInfo["php_command"] = getCommandTemplate();
    });
};
