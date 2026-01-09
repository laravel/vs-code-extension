import app from "./app";
import auth from "./auth";
import bladeComponents from "./blade-components";
import bladeDirectives from "./blade-directives";
import bootstrapLaravel from "./bootstrap-laravel";
import configs from "./configs";
import inertia from "./inertia";
import middleware from "./middleware";
import models from "./models";
import pest from "./pest";
import routes from "./routes";
import translations from "./translations";
import views from "./views";

const templates = {
    app,
    auth,
    bladeComponents,
    bladeDirectives,
    bootstrapLaravel,
    configs,
    inertia,
    middleware,
    models,
    pest,
    routes,
    translations,
    views,
};

export type TemplateName = keyof typeof templates;

export const getTemplate = (name: TemplateName) => {
    if (!templates[name]) {
        throw new Error("Template not found: " + name);
    }

    return templates[name];
};
