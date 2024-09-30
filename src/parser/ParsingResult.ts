import { FTParsing } from "../types";

export default class ParsingResult {
    public result: FTParsing.Result;

    private additionalInfo: Record<string, any> = {};

    constructor(result: FTParsing.Result) {
        this.result = result;
    }

    public currentParamIsArray(): boolean {
        const args = this.result.methodExistingArgs;

        if (args.length === 0) {
            return false;
        }

        const currentArg = args[args.length - 1];

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
        return this.result.fillingInArrayKey;
    }

    public fillingInArrayValue(): boolean {
        return this.result.fillingInArrayValue;
    }

    public class() {
        return this.result.classUsed;
    }

    public isClass(className: string) {
        return this.class() === className;
    }

    public func() {
        return this.result.methodUsed;
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

        return this.result.methodExistingArgs[index];
    }

    public paramIndex() {
        return this.result.paramIndex;
    }

    public isParamIndex(index: number) {
        return this.paramIndex() === index;
    }

    public paramCount() {
        return this.result.methodExistingArgs.length;
    }
}
