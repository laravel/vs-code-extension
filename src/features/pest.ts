import { getPestConfig } from "../repositories/pest";

export const initPestHelpers = () => {
    // Calling getPestConfig() triggers the repository's loadAndWatch,
    // which will generate the helper files and watch for changes
    getPestConfig();
};
