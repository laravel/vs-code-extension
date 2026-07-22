import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import {
    findCachedLspBinary,
    findLspReleaseAsset,
    LSP_UPDATE_THROTTLE_MS,
    shouldCheckForLspUpdate,
} from "../lsp/binary";

const assets = [
    {
        name: "server-v1.2.3-arm64-darwin",
        browser_download_url: "https://example.com/darwin-arm64",
    },
    {
        name: "server-v1.2.3-x64-darwin",
        browser_download_url: "https://example.com/darwin-x64",
    },
    {
        name: "server-v1.2.3-arm64-linux",
        browser_download_url: "https://example.com/linux-arm64",
    },
    {
        name: "server-v1.2.3-x64-linux",
        browser_download_url: "https://example.com/linux-x64",
    },
    {
        name: "server-v1.2.3-x64-win32.exe",
        browser_download_url: "https://example.com/windows-x64",
    },
];

suite("Laravel LSP Binary Update Test Suite", () => {
    test("selects the release asset for each supported platform", () => {
        assert.strictEqual(
            findLspReleaseAsset(assets, "darwin", "arm64")?.name,
            "server-v1.2.3-arm64-darwin",
        );
        assert.strictEqual(
            findLspReleaseAsset(assets, "darwin", "x64")?.name,
            "server-v1.2.3-x64-darwin",
        );
        assert.strictEqual(
            findLspReleaseAsset(assets, "linux", "arm64")?.name,
            "server-v1.2.3-arm64-linux",
        );
        assert.strictEqual(
            findLspReleaseAsset(assets, "linux", "x64")?.name,
            "server-v1.2.3-x64-linux",
        );
        assert.strictEqual(
            findLspReleaseAsset(assets, "win32", "x64")?.name,
            "server-v1.2.3-x64-win32.exe",
        );
        assert.strictEqual(
            findLspReleaseAsset(assets, "win32", "arm64"),
            undefined,
        );
    });

    test("throttles update checks for two hours", () => {
        const now = 10_000_000;

        assert.strictEqual(shouldCheckForLspUpdate(undefined, now), true);
        assert.strictEqual(shouldCheckForLspUpdate(now, now), false);
        assert.strictEqual(
            shouldCheckForLspUpdate(now - LSP_UPDATE_THROTTLE_MS + 1, now),
            false,
        );
        assert.strictEqual(
            shouldCheckForLspUpdate(now - LSP_UPDATE_THROTTLE_MS, now),
            true,
        );
    });

    test("uses the newest compatible cached binary", () => {
        const root = path.join(path.parse(process.cwd()).root, "downloads");
        const files = [
            vscode.Uri.file(path.join(root, "server-v1.2.9-arm64-darwin")),
            vscode.Uri.file(path.join(root, "server-v1.2.10-arm64-darwin")),
            vscode.Uri.file(path.join(root, "server-v9.0.0-x64-darwin")),
            vscode.Uri.file(
                path.join(root, "server-v9.0.0-arm64-darwin.pending"),
            ),
        ];

        assert.strictEqual(
            path.basename(
                findCachedLspBinary(files, "darwin", "arm64")!.fsPath,
            ),
            "server-v1.2.10-arm64-darwin",
        );
    });
});
