import { TsParsingResult } from "@src/types";
import ts from "typescript";
import { NodeParserFactory } from ".";
import { NodeParser } from "./abstractParser";
import { BaseParser } from "./baseParser";

export class MethodCallParser extends NodeParser {
    protected nodeParserFactory: NodeParserFactory;

    protected typeChecker: ts.TypeChecker;

    constructor(
        nodeParserFactory: NodeParserFactory,
        typeChecker: ts.TypeChecker,
    ) {
        super();

        this.nodeParserFactory = nodeParserFactory;
        this.typeChecker = typeChecker;
    }

    public parse(
        node: ts.Node,
    ): TsParsingResult.MethodCall | TsParsingResult.Base {
        const children = this.nodeParserFactory.createContexts(
            node.getChildren(),
        );

        const symbol = this.typeChecker.getSymbolAtLocation(node);

        if (!symbol) {
            return new BaseParser(
                this.nodeParserFactory,
                this.typeChecker,
            ).parse(node);
        }

        const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);

        const signatures = type.getCallSignatures();

        const returnTypes = signatures.map((sig) => {
            const type = this.typeChecker.getReturnTypeOfSignature(sig);

            let importPath = null;

            const typeSymbol = type.aliasSymbol ?? type.getSymbol();

            if (typeSymbol) {
                const declaration = typeSymbol.getDeclarations()?.[0];

                importPath = declaration?.getSourceFile().fileName ?? null;
            }

            return {
                name: this.typeChecker.typeToString(type),
                importPath: importPath,
            } as TsParsingResult.ReturnType;
        });

        return {
            type: "methodCall",
            symbolFlags: this.getSymbolFlagValues(symbol.getFlags()),
            methodName: symbol.getName(),
            children: children,
            returnTypes: returnTypes,
            start: node.getStart(),
            end: node.getEnd(),
        } as TsParsingResult.MethodCall;
    }
}
