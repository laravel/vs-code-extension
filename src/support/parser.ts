import engine from "php-parser";

// TODO: Problem?
// @ts-ignore
const parser = new engine({
    parser: {
        extractDoc: true,
        php8: true,
    },
});

type TokenFormatted = [string, string, number];
type Token = string | TokenFormatted;

const getToken = (tokens: TokenFormatted[], index: string, offset: number) =>
    tokens[parseInt(index) + offset];

const getFqn = (
    tokens: TokenFormatted[],
    cls: string,
): {
    fqn?: string | null;
} => {
    const tokensReversed = [...tokens].reverse();
    const firstUse = tokensReversed.findIndex((token) => token[0] === "T_USE");

    if (firstUse === -1) {
        return {
            fqn: cls,
        };
    }

    for (let j = firstUse; j < tokensReversed.length; j++) {
        const [type, value, line] = tokensReversed[j];

        if (type !== "T_USE") {
            continue;
        }

        const fqnCandidate = tokensReversed[j + 1];

        if (fqnCandidate[1] === cls) {
            return {
                fqn: fqnCandidate[1],
            };
        }

        if (fqnCandidate[1].endsWith(`\\${cls}`)) {
            return {
                fqn: fqnCandidate[1],
            };
        }

        const nextToken = tokensReversed[j + 2];

        if (nextToken[0] !== "T_AS") {
            continue;
        }

        const alias = tokensReversed[j + 3];

        if (alias[1] === cls) {
            return {
                fqn: fqnCandidate[1],
            };
        }
    }

    return {
        fqn: cls,
    };
};

const extractClassAndFunction = (
    tokens: TokenFormatted[],
): {
    class?: string | null;
    fqn?: string | null;
    func?: string | null;
} => {
    const func = tokens.shift()?.[1];

    if (!["T_OBJECT_OPERATOR", "T_DOUBLE_COLON"].includes(tokens[0][0])) {
        // Just a function, return early
        return {
            func,
        };
    }

    let variableToFind = null;

    for (let i in tokens) {
        const [type, value, line] = tokens[i];

        if (type === "T_DOUBLE_COLON") {
            const cls = getToken(tokens, i, 1)[1];

            return {
                ...getFqn(tokens, cls),
                func,
            };
        }

        if (type === "T_OBJECT_OPERATOR") {
            const nextToken = getToken(tokens, i, 1);

            if (nextToken[0] === "T_VARIABLE") {
                variableToFind = nextToken[1];
            }
        }

        if (variableToFind === null) {
            continue;
        }

        // At this point we're on the hunt for a variable
        if (type !== "T_VARIABLE") {
            continue;
        }

        if (value !== variableToFind) {
            continue;
        }

        const nextToken = getToken(tokens, i, 1);
        const previousToken = getToken(tokens, i, -1);

        if (
            nextToken[0] === "T_STRING" ||
            nextToken[0] === "T_NAME_QUALIFIED"
        ) {
            const cls = nextToken[1];

            // Type hinted, we got the class
            return {
                ...getFqn(tokens, cls),
                func: func,
            };
        }

        if (
            nextToken[1] === "(" &&
            getToken(tokens, i, 2)[0] === "T_FUNCTION"
        ) {
            // It was a param in a function, no type hint, no class
            return {
                func,
            };
        }

        if (previousToken[1] === "=") {
            if (
                getToken(tokens, i, -2)[0] === "T_NEW" &&
                ["T_STRING", "T_NAME_QUALIFIED"].includes(
                    getToken(tokens, i, -3)[0],
                )
            ) {
                const cls = getToken(tokens, i, -3)[1];

                return {
                    ...getFqn(tokens, cls),
                    func,
                };
            }

            if (
                ["T_STRING", "T_NAME_QUALIFIED"].includes(
                    getToken(tokens, i, -2)[0],
                )
            ) {
                const cls = getToken(tokens, i, -2)[1];

                return {
                    ...getFqn(tokens, cls),
                    func,
                };
            }

            return {
                func,
            };
        }
    }

    return {
        func,
    };
};

export interface ParsingResult {
    class?: string;
    fqn?: string;
    function?: string;
    classDefinition?: string;
    classExtends?: string;
    classImplements?: string[];
    functionDefinition?: string;
    param: {
        index: number;
        isArray: boolean;
        isKey: boolean;
        key: string | null;
        keys: string[];
    };
    parameters: string[];
}

export const getTokens = (code: string): Token[] => {
    return parser.tokenGetAll(code);
};

const getNamespace = (tokens: Token[]): string | undefined => {
    const namespaceIndex = tokens.findIndex(
        (token) => token[0] === "T_NAMESPACE",
    );

    if (namespaceIndex === -1) {
        return;
    }

    const ns = tokens[namespaceIndex - 1];

    if (ns[0] !== "T_NAME_QUALIFIED") {
        return;
    }

    return ns[1];
};

const getClassDefinition = (
    tokens: TokenFormatted[],
):
    | Pick<
          ParsingResult,
          "classDefinition" | "classExtends" | "classImplements"
      >
    | undefined => {
    const definitionIndex = tokens.findIndex((token) => token[0] === "T_CLASS");

    if (definitionIndex === -1) {
        return;
    }

    const className = tokens[definitionIndex - 1];

    if (className[0] !== "T_STRING") {
        return;
    }

    const namespace = getNamespace(tokens);
    const tokensPastClassDefinition = tokens
        .slice(0, definitionIndex - 1)
        .reverse();
    const firstBrace = tokensPastClassDefinition.findIndex(
        (token) => token[1] === "{",
    );

    const extendsOrImplements = tokensPastClassDefinition.slice(0, firstBrace);

    let index = 0;
    let classExtends;
    let classImplements: string[] = [];

    while (index < extendsOrImplements.length) {
        if (extendsOrImplements[index][0] === "T_EXTENDS") {
            classExtends = getFqn(tokens, extendsOrImplements[index + 1][1]);
        }

        if (extendsOrImplements[index][0] === "T_IMPLEMENTS") {
            let implementsIndex = index + 1;

            while (
                extendsOrImplements[implementsIndex] &&
                extendsOrImplements[implementsIndex][0] !== "T_EXTENDS"
            ) {
                if (extendsOrImplements[implementsIndex][0] === "T_STRING") {
                    classImplements.push(
                        extendsOrImplements[implementsIndex][1],
                    );
                }

                implementsIndex++;
            }
        }

        index++;
    }

    return {
        classDefinition: [namespace, className[1]]
            .filter((i) => !!i)
            .join("\\"),
        classExtends: classExtends?.fqn ?? undefined,
        classImplements: classImplements
            .map((i) => getFqn(tokens, i).fqn ?? "")
            .filter((i) => i !== ""),
    };
};

const parsingResultDefaultObject = (): ParsingResult => {
    return {
        param: {
            index: 0,
            isArray: false,
            isKey: false,
            key: null,
            keys: [],
        },
        parameters: [],
    };
};

const getInitialResult = (
    tokens: TokenFormatted[],
): [ParsingResult | null, TokenFormatted[]] => {
    let params = [];
    let closedParens = 0;

    for (let i in tokens) {
        const nextToken = tokens[i];
        const [type, value, line] = nextToken;

        if (value === ")") {
            closedParens++;
            params.push(nextToken);
            continue;
        }

        if (value !== "(") {
            params.push(nextToken);
            continue;
        }

        if (closedParens > 0) {
            closedParens--;
            params.push(nextToken);
            continue;
        }

        // We've found the opening parenthesis
        const {
            class: cls,
            func,
            fqn,
        } = extractClassAndFunction(tokens.slice(parseInt(i) + 1));

        let result = parsingResultDefaultObject();

        if (cls) {
            result.class = cls;
        }

        if (func) {
            result.function = func;
        }

        if (fqn) {
            result.fqn = fqn;
        }

        return [result, params];
    }

    return [null, []];
};

const parseParamsFromResults = (
    params: TokenFormatted[],
): {
    parameters: string[];
    isArray: boolean;
    isKey: boolean;
    keys: string[];
} => {
    let nestedLevel = 0;

    let currentParam = "";

    const parameters = [];

    let paramTokens = [];
    let isArray = false;
    let isKey = false;
    let keys: string[] = [];

    // Params are in reverse order, so we need to loop them in their actual order
    const paramsToLoop = params.reverse();

    for (let i in paramsToLoop) {
        const [type, value, line] = params[i];

        if (["[", "(", "{"].includes(value)) {
            nestedLevel++;
            currentParam += value;
            paramTokens.push(params[i]);

            continue;
        }

        if (["]", ")", "}"].includes(value)) {
            nestedLevel--;
            currentParam += value;
            paramTokens.push(params[i]);

            continue;
        }

        if (nestedLevel > 0) {
            const finalValue = type === "T_RETURN" ? value + " " : value;

            currentParam += finalValue;
            paramTokens.push(params[i]);

            continue;
        }

        if (value !== ",") {
            const finalValue =
                type === "T_CONSTANT_ENCAPSED_STRING"
                    ? value.substring(1).slice(0, -1)
                    : value;

            currentParam += finalValue;
            paramTokens.push(params[i]);

            continue;
        }

        parameters.push(currentParam);
        currentParam = "";
        paramTokens = [];
    }

    if (paramTokens.length === 0) {
        return {
            parameters,
            isArray,
            isKey,
            keys,
        };
    }

    let finalParamNestingLevel = 0;
    let inKey = true;

    for (let i in paramTokens) {
        const [type, value, line] = paramTokens[i];

        if (finalParamNestingLevel === 1 && inKey) {
            if (type === "T_CONSTANT_ENCAPSED_STRING") {
                keys.push(value.substring(1).slice(0, -1));
            }
        }

        if (type === "T_DOUBLE_ARROW") {
            inKey = false;
        }

        if (["["].includes(value)) {
            finalParamNestingLevel++;
            inKey = true;
        }

        if (["]"].includes(value)) {
            finalParamNestingLevel--;
            inKey = true;
        }
    }

    if (finalParamNestingLevel > 0) {
        isArray = true;
    }

    if (finalParamNestingLevel === 1) {
        if (["[", ","].includes(paramTokens[paramTokens.length - 1][1])) {
            isKey = true;
        }
    }

    return {
        parameters,
        isArray,
        isKey,
        keys,
    };
};

const getFunctionDefinition = (
    tokens: TokenFormatted[],
): string | undefined => {
    for (let i in tokens) {
        const [type, value, line] = tokens[i];

        if (type !== "T_FUNCTION") {
            continue;
        }

        const nextToken = getToken(tokens, i, -1);

        if (nextToken[0] === "T_STRING") {
            return nextToken[1];
        }
    }
};

export const getNormalizedTokens = (code: string): TokenFormatted[] => {
    return parser
        .tokenGetAll(code)
        .map((token: Token) => {
            if (typeof token === "string") {
                return ["T_CUSTOM_STRING", token, -1];
            }

            return token;
        })
        .filter((token: Token) => token[0] !== "T_WHITESPACE");
};

export const parse = (code: string): ParsingResult | null => {
    const tokens = parser
        .tokenGetAll(code)
        .map((token: Token) => {
            if (typeof token === "string") {
                return ["T_CUSTOM_STRING", token, -1];
            }

            return token;
        })
        .filter((token: Token) => token[0] !== "T_WHITESPACE")
        .reverse();

    const firstToken = tokens.shift();

    // TODO: What about other triggers? Like blade or variable auto complete?
    if (
        firstToken[0] !== "T_CONSTANT_ENCAPSED_STRING" &&
        firstToken[1] !== '"'
    ) {
        // We are only concerned with ' and " as the trigger
        return null;
    }

    if (
        firstToken[0] === "T_CONSTANT_ENCAPSED_STRING" &&
        ![",", "(", "["].includes(tokens[0][1])
    ) {
        // This is the closing quote, we are not interested in this
        return null;
    }

    let [result, params] = getInitialResult(tokens);

    const classDefinition = getClassDefinition(tokens);

    if (classDefinition) {
        if (!result) {
            result = parsingResultDefaultObject();
        }

        result = {
            ...result,
            ...classDefinition,
            functionDefinition: getFunctionDefinition(tokens),
        };
    }

    if (!result) {
        return null;
    }

    const finalParams = parseParamsFromResults(params);

    result.parameters = finalParams.parameters;
    result.param.index = finalParams.parameters.length;
    result.param.keys = finalParams.keys;
    result.param.isArray = finalParams.isArray;
    result.param.isKey = finalParams.isKey;

    return result;
};
