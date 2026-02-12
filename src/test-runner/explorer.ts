import * as vscode from "vscode";

import { projectPath } from "@src/support/project";
import { runInLaravel, template } from "@src/support/php";

export interface TestSuite {
    name: string;
    files: {
        name: string;
        path: string;
        directories: string[];
        tests: {
            name: string;
            eventName: string;
            line: number;
        }[];
    }[];
}

export const updateExplorer = async (controller: vscode.TestController) => {
    const suites = await getTestSuites();

    controller.items.replace(
        suites.map((suite) => buildSuiteItem(controller, suite)),
    );
};

const getTestSuites = () => {
    return runInLaravel<TestSuite[]>(template("tests"));
};

const buildSuiteItem = (
    controller: vscode.TestController,
    suite: TestSuite,
) => {
    const suiteItem = controller.createTestItem(
        `suite:${suite.name}`,
        suite.name,
        undefined,
    );

    suite.files.forEach((file) => {
        const uri = vscode.Uri.file(projectPath(file.path));
        const basePath = getBasePath(file.path, file.directories);

        const parent = ensureFolderPath(
            controller,
            suiteItem,
            basePath,
            file.directories,
        );

        const fileItem = controller.createTestItem(
            `file:${file.path}`,
            file.name,
            uri,
        );

        const testItems = file.tests.map((test) => {
            const testItem = controller.createTestItem(
                `test:${file.path}:${test.eventName}`,
                test.name,
                uri,
            );

            testItem.range = testRange(test.line);

            return testItem;
        });

        fileItem.children.replace(testItems);
        parent.children.add(fileItem);
    });

    return suiteItem;
};

const ensureFolderPath = (
    controller: vscode.TestController,
    suiteItem: vscode.TestItem,
    basePath: string,
    folders: string[],
) => {
    let parent = suiteItem;
    let currentPath = basePath;

    folders.forEach((folder) => {
        currentPath = `${currentPath}/${folder}`;
        const id = `dir:${currentPath}`;
        let item = parent.children.get(id);

        if (!item) {
            item = controller.createTestItem(id, folder);
            parent.children.add(item);
        }

        parent = item;
    });

    return parent;
};

const getBasePath = (filePath: string, directories: string[]): string => {
    let basePath = filePath.replace(/\/[^/]+$/, ""); // Remove filename

    for (let i = directories.length - 1; i >= 0; i--) {
        basePath = basePath.replace(new RegExp(`/${directories[i]}$`), "");
    }

    return basePath;
};

const testRange = (line: number) => {
    const position = new vscode.Position(line - 1, 0);

    return new vscode.Range(position, position);
};
