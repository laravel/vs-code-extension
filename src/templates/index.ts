import app from "./app";
import auth from "./auth";
import bladeDirectives from "./blade-directives";
import bootstrapLaravel from "./bootstrap-laravel";
import configs from "./configs";
import middleware from "./middleware";
import models from "./models";
import routes from "./routes";
import translations from "./translations";

const templates = {
    app,
    auth,
    bladeDirectives,
    bootstrapLaravel,
    configs,
    middleware,
    models,
    routes,
    translations,
};

export type TemplateName = keyof typeof templates;

export const getTemplate = (name: TemplateName) => {
    if (!templates[name]) {
        throw new Error("Template not found: " + name);
    }

    return templates[name];
};
