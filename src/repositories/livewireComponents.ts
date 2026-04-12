import { inAppDirs } from "@src/support/fileWatcher";

export const patterns = {
    bladeFiles: inAppDirs("{,**/}{view,views}/{*,**/*}.blade.php"),
    classFiles: "app/Livewire/{,*,**/*}.php",
};
