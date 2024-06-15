import { Observable, Subscription, exhaustMap, of, timer } from "rxjs";
import { filter, map, switchMap, tap } from "rxjs/operators";
import { WebviewPanel } from "vscode";

import Common, { CommandInfo } from "../../Common";

interface RouteRow {
    domain: string;
    method: string;
    uri: string;
    name: string;
    action: string;
    middleware: string[];
}

export default class RouteList extends Common {
    private static panel: WebviewPanel;
    private static headers: string[] = [
        "Domain",
        "Method",
        "URI",
        "Name",
        "Action",
        "Middleware",
    ];

    private static observable = timer(0, 5000).pipe(
        map(() => "route:list --json"),
        tap(async () => {
            if (typeof RouteList.panel === "undefined") {
                const artisan = await Common.getArtisanRoot();
                RouteList.panel = await Common.openVirtualHtmlFile(
                    "route-list",
                    "Route List",
                    RouteList.headers,
                    [],
                    artisan,
                );
                RouteList.panel.onDidDispose(() => {
                    RouteList.subscription.unsubscribe();
                    RouteList.panel = undefined;
                });
            }
        }),
        filter(() => typeof RouteList.panel !== "undefined"),
        exhaustMap((cmd) => RouteList.runCommand(cmd)),
        filter((info) => {
            if (info.err) {
                Common.showError(
                    "The route list could not be generated.",
                    info.err,
                );
                return false;
            }
            return true;
        }),
        switchMap((c) =>
            of(c).pipe(
                map((info) => RouteList.parseRouteList(info.stdout)),
                tap((info) =>
                    RouteList.panel.webview.postMessage({ rows: info.rows }),
                ),
            ),
        ),
    );
    private static subscription?: Subscription;

    public static async run() {
        this.subscription = this.observable.subscribe();
    }

    private static runCommand(cmd) {
        return new Observable<CommandInfo>((sub) => {
            this.execCmd(cmd, async (info) => {
                sub.next(info);
                sub.complete();
            });
        });
    }

    private static parseRouteList(stdout: string): {
        headers: string[];
        rows: string[][];
    } {
        const data = JSON.parse(stdout);
        // {domain: null, method: 'GET|HEAD', uri: '/', name: null, action: 'Closure', middleware: []}
        let rows = data.map((row: RouteRow) => [
            row.domain ?? "",
            row.method,
            row.uri,
            row.name,
            row.action,
            row.middleware,
        ]);
        const resultRows = [];
        rows.forEach((row) => {
            if (row[5].length > 1) {
                resultRows.push([
                    row[0],
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5][0],
                ]);
                row[5].forEach(
                    (middleware, idx) =>
                        idx > 0 &&
                        resultRows.push(["", "", "", "", "", middleware]),
                );
            } else {
                resultRows.push([
                    row[0],
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5][0],
                ]);
            }
        });
        return {
            headers: [
                "Domain",
                "Method",
                "URI",
                "Name",
                "Action",
                "Middleware",
            ],
            rows: resultRows,
        };
    }
}
