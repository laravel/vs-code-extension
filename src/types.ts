export namespace FTParsing {
    export interface Result {
        classDefinition: string | null;
        implements: string[];
        extends: string | null;
        methodDefinition: string | null;
        methodDefinitionParams: string[];
        methodExistingArgs: Arg[];
        classUsed: string | null;
        methodUsed: string | null;
        parent: Result | null;
        variables: Variables;
        definedProperties: string[];
        fillingInArrayKey: boolean;
        fillingInArrayValue: boolean;
        paramIndex: number;
    }

    type Arg = NonArrayArg | ArrayArg;

    interface ArrayValue {
        key: Arg;
        value: Arg;
    }

    interface NonArrayArg {
        type: Exclude<string, "array">;
        value: string;
        arguments?: Arg[];
    }

    interface ArrayArg {
        type: "array";
        value: ArrayValue[];
        arguments?: Arg[];
    }

    export interface Variables {
        [key: string]: Arg;
    }
}
