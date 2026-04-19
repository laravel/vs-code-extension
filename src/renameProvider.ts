import {
    Position,
    RenameProvider,
    TextDocument,
    WorkspaceEdit,
    SymbolKind,
    LocationLink,
    Location,
} from 'vscode';
import { getReferences, getSymbol } from './renameApi';
import { getTargetUri } from './renameUtils';
import { BaseRenameProvider } from './renameBase';

export class PhpRenameProvider extends BaseRenameProvider implements RenameProvider {

    public async provideRenameEdits(
        document: TextDocument,
        position: Position,
        newName: string
    ): Promise<WorkspaceEdit | null> {

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const oldName = document.getText(wordRange);

        const references = await getReferences(document.uri, position);

        if (!references || references.length === 0) {
            throw new Error('You can not rename this symbol');
        }

        const symbolResult = await getSymbol(document.uri, position);

        if (symbolResult) {
            const [, def] = symbolResult;
            const targetUri = getTargetUri(def);

            if (targetUri && this.isFromVendor(targetUri)) {
                throw new Error('You can not rename symbols from vendor');
            }
        }

        const edit = new WorkspaceEdit();

        for (const location of references) {
            if (symbolResult) {
                const [symbol] = symbolResult;

                switch (symbol.kind) {
                    case SymbolKind.Property:
                        this.renameProperty(
                            document.getText(location.range),
                            location,
                            newName,
                            edit
                        );
                        break;

                    case SymbolKind.Class:
                    case SymbolKind.Interface:
                    case SymbolKind.Module:
                        this.renameClassLike(location, oldName, newName, edit);
                        break;

                    default:
                        edit.replace(location.uri, location.range, newName);
                        break;
                }

            } else {
                edit.replace(location.uri, location.range, newName);
            }
        }

        if (symbolResult) {
            const [symbol, def] = symbolResult;

            if (
                symbol.kind === SymbolKind.Class ||
                symbol.kind === SymbolKind.Interface ||
                symbol.kind === SymbolKind.Module
            ) {
                this.renameFile(edit, def, newName);
            }
        }

        return edit;
    }
}
