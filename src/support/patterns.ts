export const wordMatchRegex = /[\w\d\-_\.\:\\\/@]+/g;

export const viewMatchRegex = (() => {
    const toCheck = [
        "view",
        "markdown",
        "assertViewIs",
        "@include",
        "@extends",
        "@component",
        // TODO: Deal with aliases
        "View::make",
    ].map((item) => `${item}\\(['"]`);

    return `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;
})();

export const inertiaMatchRegex = (() => {
    const toCheck = ["Inertia::(?:render|modal)"].map(
        (item) => `${item}\\(['"]`,
    );

    return `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;
})();

export const configMatchRegex = (() => {
    const toCheck = ["config", "Config::get"].map((item) => `${item}\\(['"]`);

    return `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;
})();

export const appBindingMatchRegex = (() => {
    const toCheck = ["app", "App::make"].map((item) => `${item}\\(['"]`);

    return `(?<=${toCheck.join("|")})(?:[^'"\\s]+(?:\\/[^'"\\s]+)*)`;
})();
