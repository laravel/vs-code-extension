import app from "./app";
import auth from "./auth";
import bladeDirectives from "./blade-directives";
import bootstrapLaravel from "./bootstrap-laravel";
import eloquentProvider from "./eloquent-provider";
import middleware from "./middleware";
import routes from "./routes";
import translations from "./translations";

const templates = {
    app,
    auth,
    bladeDirectives,
    middleware,
    routes,
    bootstrapLaravel,
    eloquentProvider,
    translations,
};

export type TemplateName = keyof typeof templates;

export const getTemplate = (name: TemplateName) => {
    if (!templates[name]) {
        throw new Error("Template not found: " + name);
    }

    return templates[name];
};
