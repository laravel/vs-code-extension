import { facade } from "@src/support/util";
import { AutocompleteParsingResult } from "@src/types";

export default class AutocompleteResult {
    public result: AutocompleteParsingResult.ContextValue;

    private additionalInfo: Record<string, any> = {};

    constructor(result: AutocompleteParsingResult.ContextValue) {
        this.result = result;
    }

    public currentParamIsArray(): boolean {
        const currentArg = this.param();

        if (currentArg === null) {
            return false;
        }

        return currentArg?.type === "array";
    }

    public currentParamArrayKeys(): string[] {
        const param = this.param();

        if (typeof param === "undefined" || param.type !== "array") {
            return [];
        }

        return (param as AutocompleteParsingResult.ArrayValue).children.map(
            (child) => child.key.value,
        );
    }

    public fillingInArrayKey(): boolean {
        return this.param()?.autocompletingKey ?? false;
    }

    public fillingInArrayValue(): boolean {
        return this.param()?.autocompletingValue ?? false;
    }

    public class() {
        // @ts-ignore
        return this.result.className ?? null;
    }

    public isClass(className: string) {
        return this.class() === className;
    }

    public isFacade(className: string) {
        return this.class() === facade(className);
    }

    public func() {
        // @ts-ignore
        return this.result.methodName;
    }

    public addInfo(key: string, value: any) {
        this.additionalInfo[key] = value;
    }

    public getInfo(key: string) {
        return this.additionalInfo[key];
    }

    public loop(
        cb: (context: AutocompleteParsingResult.ContextValue) => boolean | void,
    ) {
        let context = this.result;
        let shouldContinue = true;

        while (context.parent !== null && shouldContinue) {
            shouldContinue = cb(context) ?? true;

            context = context.parent;
        }
    }

    public isFunc(func: string) {
        return this.func() === func;
    }

    public param(index?: number) {
        index = index ?? this.paramIndex();

        if (index === null || typeof index === "undefined") {
            return null;
        }

        // @ts-ignore
        return this.result.arguments?.children[index]?.children[0];
    }

    public paramIndex() {
        // @ts-ignore
        return this.result.arguments?.autocompletingIndex ?? null;
    }

    public argName() {
        return this.param()?.name ?? null;
    }

    public isParamIndex(index: number) {
        return this.paramIndex() === index;
    }

    public paramCount() {
        // @ts-ignore
        return this.result.arguments?.children.length ?? 0;
    }
}
