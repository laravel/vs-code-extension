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

    public getEnclosingClass(): AutocompleteParsingResult.ClassDefinition | null {
        let context: AutocompleteParsingResult.ContextValue | null = this.result;

        while (context !== null) {
            if (context.type === "classDefinition") {
                return context as AutocompleteParsingResult.ClassDefinition;
            }
            context = context.parent;
        }

        return null;
    }

    public getEnclosingMethodDefinition(): AutocompleteParsingResult.MethodDefinition | null {
        let context: AutocompleteParsingResult.ContextValue | null = this.result;

        while (context !== null) {
            if (context.type === "methodDefinition") {
                return context as AutocompleteParsingResult.MethodDefinition;
            }
            context = context.parent;
        }

        return null;
    }

    public isInsideMethodDefinition(methodName: string | string[]): boolean {
        const definition = this.getEnclosingMethodDefinition();
        if (!definition || !definition.methodName) {
            return false;
        }

        if (Array.isArray(methodName)) {
            return methodName.includes(definition.methodName);
        }

        return definition.methodName === methodName;
    }

    public classExtends(className: string): boolean {
        const enclosing = this.getEnclosingClass();
        if (!enclosing || !enclosing.extends) {
            return false;
        }

        return enclosing.extends === className;
    }
}
