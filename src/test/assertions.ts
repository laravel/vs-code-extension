import * as assert from "assert";
import * as vscode from "vscode";
import {
    getCompletions,
    getHovers,
    getLinks,
    hoverToText,
    includesNormalized,
} from "./helper";

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
