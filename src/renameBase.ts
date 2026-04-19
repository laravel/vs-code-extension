import * as path from 'path';
import {
    Location,
    LocationLink,
    Uri,
    WorkspaceEdit,
} from 'vscode';
import { getTargetUri } from './renameUtils';

export abstract class BaseRenameProvider {
    protected renameProperty(
        actualName: string,
        location: Location,
        newName: string,
        edit: WorkspaceEdit
    ): void {
        const normalized = newName.replace(/^\$/, '');

        edit.replace(
            location.uri,
            location.range,
            actualName.startsWith('$') ? `$${normalized}` : normalized
        );
    }

    protected renameClassLike(
        location: Location,
        oldName: string,
        newName: string,
        edit: WorkspaceEdit
    ): void {
        edit.replace(
            location.uri,
            location.range.with(
                location.range.end.translate(0, -oldName.length)
            ),
            newName
        );
    }

    protected renameFile(
        edit: WorkspaceEdit,
        definition: Location | LocationLink,
        newName: string
    ): void {
        const uri = getTargetUri(definition);

        if (!uri) {
            return;
        }

        const newPath = path.format({
            dir: path.dirname(uri.path),
            name: newName,
            ext: '.php',
        });

        edit.renameFile(uri, uri.with({ path: newPath }));
    }

    protected isFromVendor(uri: Uri): boolean {
        return uri.path.includes('vendor');
    }
}
