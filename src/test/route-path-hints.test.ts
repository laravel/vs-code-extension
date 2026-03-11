import * as vscode from "vscode";
import { assertInlayHints } from "./assertions";
import { activateExtension, sleep, uri } from "./helper";

suite("Route Path Hints Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides route path hints for nested API route files", async () => {
        const doc = await vscode.workspace.openTextDocument(
            uri("routes/v2/sender-names/sender_names.php"),
        );

        await sleep(500);

        await assertInlayHints({
            doc,
            lines: [
                {
                    line: "Route::get('/', 'SenderNameController@index')->name('api.senderNames.index');",
                    hint: "/api/senderNames/",
                },
                {
                    line: "Route::get('/{senderName}', 'SenderNameController@show')->name('api.senderNames.show');",
                    hint: "/api/senderNames/{senderName}",
                },
            ],
        });
    });

    test("provides route path hints for nested web route files", async () => {
        const reportsDoc = await vscode.workspace.openTextDocument(
            uri("routes/web/api/reports.php"),
        );

        await sleep(500);

        await assertInlayHints({
            doc: reportsDoc,
            lines: [
                {
                    line: "Route::get('/reports', fn () => ['source' => 'web-api'])->name('web.api.reports.index');",
                    hint: "/api/reports",
                },
                {
                    line: "Route::get('/reports/{report}', fn (string $report) => ['report' => $report])->name('web.api.reports.show');",
                    hint: "/api/reports/{report}",
                },
            ],
        });

        const usersDoc = await vscode.workspace.openTextDocument(
            uri("routes/web/api/admin/users.php"),
        );

        await sleep(500);

        await assertInlayHints({
            doc: usersDoc,
            lines: [
                {
                    line: "Route::get('/users', fn () => ['source' => 'web-api-admin'])->name('web.api.admin.users.index');",
                    hint: "/api/admin/users",
                },
                {
                    line: "Route::get('/users/{user}', fn (string $user) => ['user' => $user])->name('web.api.admin.users.show');",
                    hint: "/api/admin/users/{user}",
                },
            ],
        });
    });
});
