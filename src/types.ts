export namespace AutocompleteParsingResult {
    export type ContextValue =
        | Argument
        | Arguments
        | ArrayItem
        | ArrayValue
        | Assignment
        | AssignmentValue
        | Base
        | ClassDefinition
        | ClosureValue
        | MethodCall
        | MethodDefinition
        | ObjectValue
        | Parameter
        | ParameterValue
        | Parameters
        | StringValue
        | Variable;

    export interface Argument {
        type: "argument";
        parent: ContextValue | null;
        children: ContextValue[];
        name: string | null;
    }

    export interface Arguments {
        type: "arguments";
        parent: ContextValue | null;
        children: ContextValue[];
        autocompletingIndex: number;
    }

    export interface ArrayItem {
        type: "array_item";
        parent: ContextValue | null;
        children: ContextValue[];
        hasKey: boolean;
        autocompletingValue: boolean;
        key: StringValue;
        value: ContextValue;
    }

    export interface ArrayValue {
        type: "array";
        parent: ContextValue | null;
        children: ArrayItem[];
    }

    export interface Assignment {
        type: "assignment";
        parent: ContextValue | null;
        name: string | null;
        value: AssignmentValue[];
    }

    export interface AssignmentValue {
        type: "assignment_value";
        parent: ContextValue | null;
        children: ContextValue[];
    }

    export interface Base {
        type: "base";
        parent: ContextValue | null;
        children: ContextValue[];
    }

    export interface ClassDefinition {
        type: "classDefinition";
        parent: ContextValue | null;
        children: ContextValue[];
        className: string | null;
        extends: string | null;
        implements: string[];
        properties: {
            name: string;
            types: string[];
        }[];
    }

    export interface ClosureValue {
        type: "closure";
        parent: ContextValue | null;
        children: ContextValue[];
        parameters: Parameters;
    }

    export interface MethodCall {
        type: "methodCall";
        parent: ContextValue | null;
        children: ContextValue[];
        methodName: string | null;
        className: string | null;
        arguments: Arguments;
    }

    export interface MethodDefinition {
        type: "methodDefinition";
        parent: ContextValue | null;
        children: ContextValue[];
        parameters: Parameters;
        methodName: string | null;
    }

    export interface ObjectValue {
        type: "object";
        parent: ContextValue | null;
        children: ContextValue[];
        className: string | null;
        arguments: Arguments;
    }

    export interface Parameter {
        type: "parameter";
        parent: ContextValue | null;
        name: string | null;
        types: string[];
    }

    export interface ParameterValue {
        type: "parameter_value";
        parent: ContextValue | null;
        children: ContextValue[];
    }

    export interface Parameters {
        type: "parameters";
        parent: ContextValue | null;
        children: ContextValue[];
    }

    export interface StringValue {
        type: "string";
        parent: ContextValue | null;
        value: string;
        start?: {
            line: number;
            column: number;
        };
        end?: {
            line: number;
            column: number;
        };
    }

    export interface Variable {
        type: "variable";
        parent: ContextValue | null;
        name: string | null;
    }
}
