import { contract, facade } from "@src/support/util";
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
        if (this.result.type === "array") {
            // I'm not sure if this is enough to determine 
            // if we're filling in a rules array key but I don't
            // have better idea at this moment :/
            return this.result.parent?.type !== "array_item" 
                && this.result.autocompletingKey;
        }

        return this.param()?.autocompletingKey ?? false;
    }

    public fillingInArrayValue(): boolean {
        return this.param()?.autocompletingValue ?? false;
    }

    public class() {
        // @ts-ignore
        return this.result.className ?? null;
    }

    public isClass(className: string | string[]) {
        if (Array.isArray(className)) {
            return className.includes(this.class());
        }

        return this.class() === className;
    }

    public isFacade(className: string) {
        return this.isClass(facade(className));
    }

    public isContract(classNames: string | string[]) {
        classNames = Array.isArray(classNames) ? classNames : [classNames];

        return classNames.some((className: string) =>
            this.isClass(contract(className)),
        );
    }

    public isClassDefinitionExtends(classNames: string | string[]) {
        classNames = Array.isArray(classNames) ? classNames : [classNames];

        let check = false;

        this.loop((context) => {
            if (classNames.some((className: string) => {
                return (context as AutocompleteParsingResult.ClassDefinition).extends === className;
            })) {
                check = true;

                return false;
            }

            return true;
        });

        return check;
    }

    public isMethodDefinition(methodNames: string | string[]) {
        methodNames = Array.isArray(methodNames) ? methodNames : [methodNames];

        let check = false;

        this.loop((context) => {
            if (methodNames.some((methodName: string) => {
                return (context as AutocompleteParsingResult.MethodDefinition).methodName === methodName;
            })) {
                check = true;

                return false;
            }

            return true;
        });

        return check;
    }

    public func() {
        // @ts-ignore
        return this.result.methodName ?? null;
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

    public isFunc(funcs: string | string[]) {
        funcs = Array.isArray(funcs) ? funcs : [funcs];

        return funcs.some((func: string) => this.func() === func);
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

    public argumentName() {
        return this.param()?.name ?? null;
    }

    public isArgumentNamed(name: string) {
        return this.argumentName() === name;
    }

    public isParamIndex(index: number) {
        return this.paramIndex() === index;
    }

    public paramCount() {
        // @ts-ignore
        return this.result.arguments?.children.length ?? 0;
    }
}
