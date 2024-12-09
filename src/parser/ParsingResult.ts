import { facade } from "@src/support/util";
import { FTParsing } from "../types";

export default class AutocompleteResult {
    public result: FTParsing.Result;

    private additionalInfo: Record<string, any> = {};

    constructor(result: FTParsing.Result) {
        this.result = result;
    }

    public currentParamIsArray(): boolean {
        const currentArg = this.param();

        if (currentArg === null) {
            return false;
        }

        return currentArg.type === "array";
    }

    public currentParamArrayKeys(): string[] {
        const param = this.param();

        if (typeof param === "undefined") {
            return [];
        }

        if (!Array.isArray(param.value)) {
            return [];
        }

        // @ts-ignore
        return param.value
            .map((item) => item.key.value)
            .filter((val) => val !== null);
    }

    public fillingInArrayKey(): boolean {
        return this.param()?.autocompletingKey ?? false;
    }

    public fillingInArrayValue(): boolean {
        return this.param()?.autocompletingValue ?? false;
    }

    public class() {
        return this.result.className;
    }

    public isClass(className: string) {
        return this.class() === className;
    }

    public isFacade(className: string) {
        return this.class() === facade(className);
    }

    public func() {
        return this.result.methodName;
    }

    public addInfo(key: string, value: any) {
        this.additionalInfo[key] = value;
    }

    public getInfo(key: string) {
        return this.additionalInfo[key];
    }

    public loop(cb: (context: FTParsing.Result) => boolean | void) {
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

        return this.result.arguments?.children[index].children[0];
    }

    public paramIndex() {
        return this.result.arguments?.autocompletingIndex;
    }

    public isParamIndex(index: number) {
        return this.paramIndex() === index;
    }

    public paramCount() {
        return this.result.arguments?.children.length ?? 0;
    }
}
