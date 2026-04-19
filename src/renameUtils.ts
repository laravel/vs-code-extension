import { Location, LocationLink, Uri } from "vscode";

export const getTargetUri = (def: Location | LocationLink): Uri | undefined => {
    if ("targetUri" in def) {
        return def.targetUri;
    }
    return def.uri;
};
