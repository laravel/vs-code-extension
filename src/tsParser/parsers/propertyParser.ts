import { TsParsingResult } from "@src/types";
import ts from "typescript";
import { NodeParser } from "./abstractParser";
import { MethodCallParser } from "./methodCallParser";

export class PropertyParser extends NodeParser {
    private methodCallParser: MethodCallParser;

    constructor(methodCallParser: MethodCallParser) {
        super();

        this.methodCallParser = methodCallParser;
    }

    public parse(
        node: ts.Node,
    ): TsParsingResult.MethodCall | TsParsingResult.Base {
        return this.methodCallParser.parse(node);
    }
}
