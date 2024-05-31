import * as assert from "assert";
import * as vscode from "vscode";
import { parse } from "../PHP";

suite("Parser Test Suite", () => {
    vscode.window.showInformationMessage("Start parser tests.");

    test("there is nothing to complete", () => {
        const code = `<?php
        Route::get('/', function () {
        config('')`;

        const expected = null;

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("basic function", () => {
        const code = `<?php
        Route::get('/', function () {
        config('`;

        const expected = {
            function: "config",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("class and static method", () => {
        const code = `<?php

        Route::get('`;

        const expected = {
            function: "get",
            class: "Route",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("class and chained method", () => {
        const code = `<?php
        User::where('name', 'something')->get('`;

        const expected = {
            function: "get",
            class: "User",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("typehinted class and method", () => {
        const code = `<?php

        Route::get('/', function (User $user) {
        $user->where('name', 'something')->find('`;

        const expected = {
            function: "find",
            class: "User",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("red herring typehinted class and method", () => {
        const code = `<?php

        Route::get('/', function (NotUser $user) {
        $user->where('name', 'something')->find();
        });

        Route::get('/', function ($user) {
        $user->where('name', 'something')->find('`;

        const expected = {
            function: "find",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("variable of instantiated class and method", () => {
        const code = `<?php

        Route::get('/', function () {

        $user = new User();
        $user->where('name', 'something')->find('`;

        const expected = {
            class: "User",
            function: "find",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("variable of class and static method", () => {
        const code = `<?php

        Route::get('/', function () {

        $user = User::make();
        $user->where('name', 'something')->find('`;

        const expected = {
            class: "User",
            function: "find",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("variable but just method", () => {
        const code = `<?php

        Route::get('/', function () {
        $user = $anotherThing;
        $user->where('name', 'something')->find('`;

        const expected = {
            function: "find",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("variable of fqn and method", () => {
        const code = `<?php

        Route::get('/', function () {
        $user = App\\Models\\User::make();
        $user->where('name', 'something')->find('`;

        const expected = {
            class: "App\\Models\\User",
            function: "find",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("first param position", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where('`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 0,
            parameters: [],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("second param position", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where('first', '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 1,
            parameters: ["first"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("array params", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where(['what' => 'ok'], '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 1,
            parameters: ["['what'=>'ok']"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("string and array params", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where('first', ['what' => 'ok'], '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 2,
            parameters: ["first", "['what'=>'ok']"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("callback param", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where(function($thing) {
            return $thing;
        }, '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 1,
            parameters: ["function($thing){return $thing;}"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("short callback param", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where(fn($thing) => $thing, '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 1,
            parameters: ["fn($thing)=>$thing"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("discard leftover array if currently typing", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where(fn($thing) => $thing, ['`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 1,
            parameters: ["fn($thing)=>$thing"],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });

    test("parameter grab bag", () => {
        const code = `<?php

        Route::get('/', function () {
        User::where('ok', [1, 2, 3], 5, function($thing) {
            return $thing;
        }, ['hi' => 'there'], '`;

        const expected = {
            class: "User",
            function: "where",
            paramIndex: 5,
            parameters: [
                "'ok'",
                "[1,2,3]",
                "5",
                "function($thing){return $thing;}",
                "['hi'=>'there']",
            ],
        };

        const result = parse(code);

        assert.deepStrictEqual(result, expected);
    });
});
