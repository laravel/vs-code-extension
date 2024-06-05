export const wordMatchRegex = /[\w\d\-_\.\:\\\/@]+/g;

const funcRegex = (funcs: string[]) => {
    funcs = funcs.map((item) => `${item}\\(['"]`);
    return `(?<=${funcs.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;
};

export const viewMatchRegex = (() => {
    return funcRegex([
        "view",
        "markdown",
        "assertViewIs",
        "@include",
        "@extends",
        "@component",
        // TODO: Deal with aliases
        "View::make",
    ]);
})();

export const inertiaMatchRegex = (() => {
    return funcRegex(["Inertia::(?:render|modal)"]);
})();

export const configMatchRegex = (() => {
    return funcRegex(["config", "Config::get"]);
})();

export const appBindingMatchRegex = (() => {
    return funcRegex(["app", "App::make"]);
})();

export const envMatchRegex = (() => {
    return funcRegex(["env"]);
})();
