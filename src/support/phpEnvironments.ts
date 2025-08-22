type PhpEnvironmentConfig = {
    check?: string | string[];
    command?: string;
    test?: (output: string) => boolean;
    relativePath?: boolean;
    label: string;
    description?: string;
};

export type PhpEnvironment =
    | "auto"
    | "herd"
    | "valet"
    | "sail"
    | "lando"
    | "ddev"
    | "local";

export const phpEnvironments: Record<PhpEnvironment, PhpEnvironmentConfig> = {
    auto: {
        label: "Auto Detect",
        description: "Auto detect the local PHP environment.",
    },
    herd: {
        check: "herd which-php",
        label: "Herd",
        description: "Auto detect PHP version Herd is using for the project.",
        command: '"{binaryPath}"',
        test: (output) => !output.includes("No usable PHP version found"),
    },
    valet: {
        check: "valet which-php",
        label: "Valet",
        description: "Auto detect PHP version Valet is using for the project.",
        command: '"{binaryPath}"',
    },
    sail: {
        check: "./vendor/bin/sail ps",
        label: "Sail",
        command: "./vendor/bin/sail php",
        relativePath: true,
    },
    lando: {
        check: "lando php -r 'echo PHP_BINARY;'",
        label: "Lando",
        command: "lando php",
        relativePath: true,
    },
    ddev: {
        check: "ddev php -r 'echo PHP_BINARY;'",
        label: "DDEV",
        command: "ddev php",
        relativePath: true,
    },
    local: {
        check: "php -r 'echo PHP_BINARY;'",
        label: "Local",
        description: "Use PHP installed on the local machine.",
        command: '"{binaryPath}"',
    },
};

export const phpEnvironmentsThatUseRelativePaths: PhpEnvironment[] =
    Object.keys(phpEnvironments).filter(
        (key) => phpEnvironments[key as PhpEnvironment]?.relativePath,
    ) as PhpEnvironment[];
