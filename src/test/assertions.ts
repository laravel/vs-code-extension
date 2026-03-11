import * as assert from "assert";
import * as vscode from "vscode";
import {
    diagnosticCode,
    getCompletions,
    getDiagnostics,
    getHovers,
    getInlayHints,
    getLinks,
    hoverToText,
    includesNormalized,
} from "./helper";

const inlayHintText = (hint: vscode.InlayHint): string => {
    if (typeof hint.label === "string") {
        return hint.label;
    }

    return hint.label.map((part) => part.value).join("");
};

type AssertCompletionsOptions = {
    doc: vscode.TextDocument;
    lines: string[];
    expects: string[];
};

export async function assertCompletions({
    doc,
    lines,
    expects,
}: AssertCompletionsOptions): Promise<void> {
    const text = doc.getText();

    for (const line of lines) {
        const lineIndex = text.indexOf(line);

        assert.ok(
            lineIndex !== -1,
            `Could not find test case '${line}' in fixture`,
        );

        const match = line.match(/'([^']+)'/);

        assert.ok(match, `Could not extract quoted value from '${line}'`);

        const value = match[1];
        const valueOffset = lineIndex + line.indexOf(value);
        const completions = await getCompletions(
            doc,
            doc.positionAt(valueOffset),
        );

        const labels = completions.items.map((entry) =>
            typeof entry.label === "string" ? entry.label : entry.label.label,
        );

        for (const expected of expects) {
            assert.ok(
                labels.some((label) => label.includes(expected)),
                `Case '${line}': Should suggest '${expected}'. Got: ${labels.join(", ")}`,
            );
        }
    }
}

export async function assertLinks({
    doc,
    lines,
}: {
    doc: vscode.TextDocument;
    lines: {
        line: string;
        target: string;
        argument?: string;
    }[];
}): Promise<void> {
    if (lines.length === 0) {
        return;
    }

    const text = doc.getText();
    const links = await getLinks(doc);

    assert.ok(links.length > 0, "Expected links to be provided");

    for (const item of lines) {
        const lineIndex = text.indexOf(item.line);

        assert.ok(
            lineIndex !== -1,
            `Could not find link case '${item.line}' in fixture`,
        );

        const selector = item.argument ?? item.line.match(/'([^']+)'/)?.[1];

        if (!selector) {
            assert.fail(
                `Could not extract selector from '${item.line}'. Provide 'argument' explicitly for this case.`,
            );
        }

        const selectorOffset = lineIndex + item.line.indexOf(selector);

        const matchedLink = links.find((link) => {
            return (
                selectorOffset >= doc.offsetAt(link.range.start) &&
                selectorOffset < doc.offsetAt(link.range.end)
            );
        });

        assert.ok(
            matchedLink?.target,
            `Case '${item.line}': Expected link target`,
        );

        assert.ok(
            includesNormalized(matchedLink?.target?.fsPath ?? "", item.target),
            `Case '${item.line}': Expected link target to include '${item.target}'. Got: ${matchedLink?.target?.toString()}`,
        );
    }
}

export async function assertHovers({
    doc,
    lines,
}: {
    doc: vscode.TextDocument;
    lines: {
        line: string;
        contains: string[];
        argument?: string;
    }[];
}): Promise<void> {
    const text = doc.getText();

    for (const item of lines) {
        const lineIndex = text.indexOf(item.line);

        assert.ok(
            lineIndex !== -1,
            `Could not find hover case '${item.line}' in fixture`,
        );

        const selector = item.argument ?? item.line.match(/'([^']+)'/)?.[1];

        if (!selector) {
            assert.fail(
                `Could not extract selector from '${item.line}'. Provide 'argument' explicitly for this case.`,
            );
        }

        const selectorOffset = lineIndex + item.line.indexOf(selector);
        const hovers = await getHovers(doc, doc.positionAt(selectorOffset + 1));

        assert.ok(
            hovers.length > 0,
            `Case '${item.line}': Expected hover information`,
        );

        const hoverText = hoverToText(hovers[0]);

        for (const expected of item.contains) {
            const containsExpected =
                expected.includes("/") || expected.includes("\\")
                    ? includesNormalized(hoverText, expected)
                    : hoverText.includes(expected);

            assert.ok(
                containsExpected,
                `Case '${item.line}': Expected hover to include '${expected}'. Got: ${hoverText}`,
            );
        }
    }
}

export async function assertDiagnostics({
    doc,
    lines,
}: {
    doc: vscode.TextDocument;
    lines: {
        line: string;
        code?: string;
        contains?: string[];
        argument?: string;
    }[];
}): Promise<void> {
    const text = doc.getText();
    const diagnostics = await getDiagnostics(doc);

    assert.ok(
        diagnostics.length > 0,
        "Expected diagnostics to be provided for document",
    );

    for (const item of lines) {
        const lineIndex = text.indexOf(item.line);

        assert.ok(
            lineIndex !== -1,
            `Could not find diagnostic case '${item.line}' in fixture`,
        );

        const selector = item.argument ?? item.line.match(/'([^']+)'/)?.[1];

        if (!selector) {
            assert.fail(
                `Could not extract selector from '${item.line}'. Provide 'argument' explicitly for this case.`,
            );
        }

        const selectorOffset = lineIndex + item.line.indexOf(selector);

        const matchedDiagnostic = diagnostics.find((diagnostic) => {
            return (
                selectorOffset >= doc.offsetAt(diagnostic.range.start) &&
                selectorOffset < doc.offsetAt(diagnostic.range.end)
            );
        });

        assert.ok(
            matchedDiagnostic,
            `Case '${item.line}': Expected a diagnostic at '${selector}'`,
        );

        if (item.code) {
            assert.strictEqual(
                diagnosticCode(matchedDiagnostic!),
                item.code,
                `Case '${item.line}': Expected diagnostic code '${item.code}'. Got: '${diagnosticCode(matchedDiagnostic!)}'`,
            );
        }

        for (const expected of item.contains ?? []) {
            assert.ok(
                matchedDiagnostic!.message.includes(expected),
                `Case '${item.line}': Expected diagnostic message to include '${expected}'. Got: '${matchedDiagnostic!.message}'`,
            );
        }
    }
}

export async function assertInlayHints({
    doc,
    lines,
}: {
    doc: vscode.TextDocument;
    lines: {
        line: string;
        hint: string;
    }[];
}): Promise<void> {
    const text = doc.getText();
    const hints = await getInlayHints(doc);

    assert.ok(hints.length > 0, "Expected inlay hints to be provided");

    for (const item of lines) {
        const lineIndex = text.indexOf(item.line);

        assert.ok(
            lineIndex !== -1,
            `Could not find inlay hint case '${item.line}' in fixture`,
        );

        const position = doc.positionAt(lineIndex);
        const matchedHint = hints.find((hint) => hint.position.line === position.line);

        assert.ok(
            matchedHint,
            `Case '${item.line}': Expected an inlay hint on the same line`,
        );

        assert.strictEqual(
            inlayHintText(matchedHint!).trim(),
            item.hint,
            `Case '${item.line}': Expected inlay hint '${item.hint}'. Got: '${inlayHintText(matchedHint!).trim()}'`,
        );
    }
}
