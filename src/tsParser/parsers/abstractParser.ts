import { TsParsingResult } from "@src/types";
import ts from "typescript";

export abstract class NodeParser {
    abstract parse(node: ts.Node): TsParsingResult.ContextValue;

    protected getSymbolFlagValues(flags: ts.SymbolFlags): number[] {
        const values: number[] = [];

        for (const key in ts.SymbolFlags) {
            const value = (ts.SymbolFlags as any)[key];

            if (
                typeof value === "number" &&
                (flags & value) === value &&
                value !== 0
            ) {
                values.push(value);
            }
        }

        return values;
    }
}
