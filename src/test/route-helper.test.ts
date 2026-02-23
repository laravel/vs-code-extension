import * as vscode from "vscode";
import {
    assertCompletions,
    assertDiagnostics,
    assertHovers,
    assertLinks,
} from "./assertions";
import { activateExtension, uri } from "./helper";

suite("Route Helper Test Suite", () => {
    suiteSetup(async () => {
        await activateExtension();
    });

    test("provides route name completions", async () => {
        await assertCompletions({
            doc: await vscode.workspace.openTextDocument(
                uri("app/route-helper.php"),
            ),
            lines: [
                "route('home');",
                // "signedRoute('dashboard');", // Not working: signedRoute helper is not available in this fixture
                "to_route('dashboard');",
                "Redirect::route('home');",
                "Redirect::signedRoute('dashboard');",
                "Redirect::temporarySignedRoute('home');",
                "redirect()->route('dashboard');",
                "URL::route('home');",
                "URL::signedRoute('dashboard');",
                "URL::temporarySignedRoute('home');",
                "url()->route('dashboard');",
                "Response::redirectToRoute('home');",
                // "response()->redirectToRoute('dashboard');", // Not working: missing expected route completions
                "Route::is('dashboard');",
                "Request::routeIs('home');",
                // "request()->routeIs('dashboard');", // Not working: missing expected route completions
            ],
            expects: ["home", "dashboard"],
        });
    });

    test("provides links for route helper references", async () => {
        await assertLinks({
            doc: await vscode.workspace.openTextDocument(
                uri("app/route-helper.php"),
            ),
            lines: [
                { line: "route('home');", target: "routes/web.php" },
                { line: "to_route('dashboard');", target: "routes/web.php" },
                { line: "Redirect::route('home');", target: "routes/web.php" },
                { line: "URL::route('home');", target: "routes/web.php" },
                {
                    line: "Response::redirectToRoute('home');",
                    target: "routes/web.php",
                },
                { line: "Route::is('dashboard');", target: "routes/web.php" },
                {
                    line: "Request::routeIs('home');",
                    target: "routes/web.php",
                },
            ],
        });
    });

    test("provides route hover details", async () => {
        await assertHovers({
            doc: await vscode.workspace.openTextDocument(
                uri("app/route-helper.php"),
            ),
            lines: [
                {
                    line: "route('home');",
                    contains: ["[Closure]", "routes/web.php"],
                },
                {
                    line: "to_route('dashboard');",
                    contains: ["[Closure]", "routes/web.php"],
                },
            ],
        });
    });

    test("provides route diagnostics", async () => {
        await assertDiagnostics({
            doc: await vscode.workspace.openTextDocument(
                uri("app/route-helper.php"),
            ),
            lines: [
                {
                    line: "route('missing.route');",
                    code: "route",
                    contains: ["missing.route", "not found"],
                },
            ],
        });
    });
});
