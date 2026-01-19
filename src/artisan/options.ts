import { Option } from "./types";

export const forceOption: Option = {
    name: "--force",
    description: "Create the class even if the cast already exists",
};

export const testOptions: Option[] = [
    {
        name: "--test",
        description: "Generate an accompanying Test test for the class",
        excludeIf: ["--pest", "--phpunit"],
    },
    {
        name: "--pest",
        description: "Generate an accompanying Pest test for the class",
        excludeIf: ["--phpunit"],
    },
    {
        name: "--phpunit",
        description: "Generate an accompanying PHPUnit test for the class",
        excludeIf: ["--pest"],
    },
];
