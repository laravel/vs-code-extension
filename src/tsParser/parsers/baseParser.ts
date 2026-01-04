import { TsParsingResult } from "@src/types";
import ts from "typescript";
import { NodeParserFactory } from ".";
import { NodeParser } from "./abstractParser";

export class BaseParser extends NodeParser {
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

    public parse(node: ts.Node): TsParsingResult.Base {
        const children = this.nodeParserFactory.createContexts(
            node.getChildren(),
        );

        const symbol = this.typeChecker.getSymbolAtLocation(node);

        return {
            type: "base",
            symbolFlags: symbol?.getFlags()
                ? this.getSymbolFlagValues(symbol.getFlags())
                : [],
            children: children,
            start: node.getStart(),
            end: node.getEnd(),
        } as TsParsingResult.Base;
    }
}
