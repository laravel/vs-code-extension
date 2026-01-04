import { TsParsingResult } from "@src/types";
import ts from "typescript";
import { NodeParser } from "./abstractParser";
import { AliasExcludesParser } from "./aliasExcludesParser";
import { AssignmentParser } from "./assignmentParser";
import { BaseParser } from "./baseParser";
import { MethodCallParser } from "./methodCallParser";
import { PropertyParser } from "./propertyParser";

export class NodeParserFactory {
    private typeChecker: ts.TypeChecker;

    constructor(typeChecker: ts.TypeChecker) {
        this.typeChecker = typeChecker;
    }

    public createContexts(
        nodes: readonly ts.Node[],
    ): TsParsingResult.ContextValue[] {
        return nodes.map((node) => {
            const nodeParser = this.createNodeParser(node);

            return nodeParser.parse(node);
        });
    }

    private createNodeParser(node: ts.Node): NodeParser {
        const symbol = this.typeChecker.getSymbolAtLocation(node);

        const flags = symbol?.getFlags();

        if (flags) {
            const methodCallParser = new MethodCallParser(
                this,
                this.typeChecker,
            );

            if (flags & ts.SymbolFlags.AliasExcludes) {
                return new AliasExcludesParser(methodCallParser);
            }

            if (flags & ts.SymbolFlags.Property) {
                return new PropertyParser(methodCallParser);
            }

            if (flags & ts.SymbolFlags.Assignment) {
                return new AssignmentParser(methodCallParser);
            }
        }

        return new BaseParser(this, this.typeChecker);
    }
}
