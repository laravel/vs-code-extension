import os from "os";
import { getCommandTemplate, runInLaravel } from "./php";

export const debugInfo: Record<string, string> = {};

export const collectDebugInfo = () => {
    debugInfo["os"] = os.platform();
    debugInfo["arch"] = os.arch();

    runInLaravel(`
        echo json_encode([
            'php_version' => phpversion(),
            'laravel_version' => app()->version(),
        ]);
    `).then((output) => {
        if (output) {
            for (const key in output as Record<string, string>) {
                // @ts-ignore
                debugInfo[key] = output[key];
            }
        }

        debugInfo["php_command"] = getCommandTemplate();
    });
};
