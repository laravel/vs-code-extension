"use strict";

import * as vscode from "vscode";
import { CompletionProvider, Tags } from "..";
import ParsingResult from "../parser/ParsingResult";
import { wordMatchRegex } from "./../support/patterns";

export default class Validation implements CompletionProvider {
    private rules = {
        accepted: "accepted",
        active_url: "active_url",
        after_or_equal: "after_or_equal:${0:date}",
        after: "after:date",
        alpha_dash: "alpha_dash",
        alpha_num: "alpha_num",
        alpha: "alpha",
        array: "array",
        ascii: "ascii",
        bail: "bail",
        before_or_equal: "before_or_equal:${1:date}",
        before: "before:${1:date}",
        between: "between:${1:min},${2:max}",
        boolean: "boolean",
        confirmed: "confirmed",
        current_password: "current_password:${1:api}",
        date_equals: "date_equals:${1:date}",
        date_format: "date_format:${1:format}",
        date: "date",
        decimal: "decimal:${1:min},${2:max}",
        declined_if: "declined_if:${1:anotherfield},${2:value}",
        declined: "declined",
        different: "different:${1:field}",
        digits_between: "digits_between:${1:min},${2:max}",
        digits: "digits:${1:value}",
        dimensions: "dimensions",
        distinct: "distinct",
        doesnt_end_with: "doesnt_end_with:${1:foo},${2:bar}",
        doesnt_start_with: "doesnt_start_with:${1:foo},${2:bar}",
        email: "email",
        ends_with: "ends_with:${1}",
        exists: "exists:${2:table},${3:column}",
        file: "file",
        filled: "filled",
        gt: "gt:${1:field}",
        gte: "gte:${1:field}",
        image: "image",
        in_array: "in_array:${1:anotherfield.*}",
        in: "in:${1:something},${2:something else}",
        integer: "integer",
        ip: "ip",
        ipv4: "ipv4",
        ipv6: "ipv6",
        json: "json",
        lowercase: "lowercase",
        lt: "lt:${1:field}",
        lte: "lte:${1:field}",
        mac_address: "mac_address",
        max_digits: "max_digits:${1:value}",
        max: "max:${1:value}",
        mimes: "mimes:${1:png,jpg}",
        mimetypes: "mimetypes:${1:text/plain}",
        min_digits: "min_digits:${1:value}",
        min: "min:${1:value}",
        multiple_of: "multiple_of:${1:value}",
        not_in: "not_in:${1:something},${2:something else}",
        not_regex: "not_regex:${1:pattern}",
        nullable: "nullable",
        numeric: "numeric",
        password: "password",
        present: "present",
        prohibited_if: "prohibited_if:${1:anotherfield},${2:value}",
        prohibited_unless: "prohibited_unless:${1:anotherfield},${2:value}",
        prohibited: "prohibited",
        regex: "regex:${1:pattern}",
        required_array_keys: "required_array_keys:${1:foo},${2:bar}",
        required_if: "required_if:${1:anotherfield},${2:value}",
        required_unless: "required_unless:${1:anotherfield},${2:value}",
        required_with_all:
            "required_with_all:${1:anotherfield},${2:anotherfield}",
        required_with: "required_with:${1:anotherfield}",
        required_without_all:
            "required_without_all:${1:anotherfield},${2:anotherfield}",
        required_without: "required_without:${1:anotherfield}",
        required: "required",
        same: "same:${1:field}",
        size: "size:${1:value}",
        sometimes: "sometimes",
        starts_with: "starts_with:${1:foo},${2:bar}",
        string: "string",
        timezone: "timezone",
        unique: "unique:${1:table},${2:column},${3:except},${4:id}",
        uppercase: "uppercase",
        url: "url",
        uuid: "uuid",
    };

    tags(): Tags {
        return [
            {
                class: facade("Validator"),
                functions: ["validate", "sometimes"],
            },
            {
                class: facade("Request"),
                functions: ["validate", "sometimes"],
            },
            {
                classExtends: "Illuminate\\Foundation\\Http\\FormRequest",
                functionDefinition: "rules",
            },
        ];
    }

    provideCompletionItems(
        result: ParsingResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (result.isFunc("validate")) {
            return this.handleValidateMethod(document, position, result);
        }

        if (result.isFunc("sometimes")) {
            return this.validatorValidation(document, position, result) || [];
        }

        // TODO: Deal with FormRequest@rules method

        return [];
    }

    private handleValidateMethod(
        document: vscode.TextDocument,
        position: vscode.Position,
        result: ParsingResult,
    ): vscode.CompletionItem[] {
        if (result.fillingInArrayKey()) {
            // We only fill in values for the validate method, abort
            return [];
        }

        if (result.isClass(facade("Request")) && result.isParamIndex(0)) {
            return this.getRules(document, position);
        }

        return this.validatorValidation(document, position, result) || [];
    }

    private validatorValidation(
        document: vscode.TextDocument,
        position: vscode.Position,
        result: ParsingResult,
    ): vscode.CompletionItem[] | undefined {
        if (result.isClass(facade("Validator")) && result.isParamIndex(1)) {
            return this.getRules(document, position);
        }
    }

    private getRules(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] {
        return Object.entries(this.rules).map(([key, value]) => {
            const completeItem = new vscode.CompletionItem(
                key,
                vscode.CompletionItemKind.Enum,
            );

            completeItem.range = document.getWordRangeAtPosition(
                position,
                wordMatchRegex,
            );

            completeItem.insertText = new vscode.SnippetString(value);

            return completeItem;
        });
    }
}
