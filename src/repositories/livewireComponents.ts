import { runInLaravel, template } from "@src/support/php";
import { projectPath } from "@src/support/project";
import { lcfirst } from "@src/support/str";
import { waitForValue } from "@src/support/util";
import { repository } from ".";
import { getConfigByName, getConfigs } from "./configs";

let livewirePaths: string[] | null = null;

export interface LivewireComponents {
    components: {
        [key: string]: {
            paths: string[];
            isVendor: boolean;
            props: {
                name: string;
                type: string;
                default: string | null;
            }[];
        };
    };
}

const load = () => {
    getConfigs().whenLoaded(() => {
        livewirePaths = [
            projectPath(lcfirst(getConfigByName('livewire.class_namespace')?.value?.replace('\\', '/') ?? 'app/Livewire')),
            getConfigByName('livewire.view_path')?.value ?? 'resources/views/livewire'
        ];
    });

    return runInLaravel<LivewireComponents>(template("livewireComponents"));
};

export const getLivewireComponents = repository<LivewireComponents>({
    load,
    pattern: () =>
        waitForValue(() => livewirePaths).then((paths) => {
            if (paths === null || paths.length === 0) {
                return null;
            }

            return paths.map(path => path + "/{*,**/*}");
        }),
    itemsDefault: {
        components: {},
    },
    fileWatcherEvents: ["create", "delete"],
});
