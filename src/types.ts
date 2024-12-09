export namespace FTParsing {
    export interface Result {
        classDefinition: string | null;
        implements: string[];
        extends: string | null;
        methodDefinition: string | null;
        parameters: string[];
        arguments?: {
            type: "arguments";
            autocompletingIndex: number;
            children: Argument[];
        };
        className: string | null;
        methodName: string | null;
        parent: Result | null;
        variables: Variables;
        definedProperties: string[];
        fillingInArrayKey: boolean;
        fillingInArrayValue: boolean;
        paramIndex: number;
    }

    interface Argument {
        type: "argument";
        children: Result[];
    }

    // type Argument = NonArrayArg | ArrayArg;

    // interface ArrayValue {
    //     key: Argument;
    //     value: Argument;
    // }

    // interface NonArrayArg {
    //     type: Exclude<string, "array">;
    //     value: string;
    //     arguments?: Argument[];
    // }

    // interface ArrayArg {
    //     type: "array";
    //     value: ArrayValue[];
    //     arguments?: Argument[];
    // }

    export interface Variables {
        [key: string]: Argument;
    }
}
