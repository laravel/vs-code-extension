type PhpEnvironmentConfig = {
    label: string;
    description?: string;
    relativePath?: boolean;
};

export type PhpEnvironment =
    | "auto"
    | "herd"
    | "valet"
    | "sail"
    | "lando"
    | "ddev"
    | "docker"
    | "local";

export const phpEnvironments: Record<PhpEnvironment, PhpEnvironmentConfig> = {
    auto: {
        label: "Auto Detect",
        description: "Auto detect the local PHP environment.",
    },
    herd: {
        label: "Herd",
        description: "Auto detect PHP version Herd is using for the project.",
    },
    valet: {
        label: "Valet",
        description: "Auto detect PHP version Valet is using for the project.",
    },
    sail: {
        label: "Sail",
        relativePath: true,
    },
    lando: {
        label: "Lando",
        relativePath: true,
    },
    ddev: {
        label: "DDEV",
        relativePath: true,
    },
    local: {
        label: "Local",
        description: "Use PHP installed on the local machine.",
    },
    docker: {
        label: "Docker",
        relativePath: true,
    },
};

export const phpEnvironmentsThatUseRelativePaths: PhpEnvironment[] =
    Object.keys(phpEnvironments).filter(
        (key) => phpEnvironments[key as PhpEnvironment]?.relativePath,
    ) as PhpEnvironment[];
