import fs from "fs";
import { Eloquent } from "..";
import { projectPath, projectPathExists } from "./project";
import { indent } from "./util";

// TODO: Chunk into several files if we have a lot of models?
// TODO: Check if doc block is already in model file, skip if it is
export const writeEloquentDocBlocks = (models: Eloquent.Models) => {
    if (!projectPathExists("vendor/_laravel_ide")) {
        // Create directory
        fs.mkdirSync(projectPath("vendor/_laravel_ide"), {
            recursive: true,
        });
    }

    const blocks = Object.values(models).map((model) => {
        const pathParts = model.class.split("\\");
        const cls = pathParts.pop();

        return {
            namespace: pathParts.join("\\"),
            className: cls,
            blocks: model.attributes
                .map((attr) => getAttributeBlocks(attr, cls || ""))
                .concat(
                    [...model.scopes, "newModelQuery", "newQuery", "query"].map(
                        (method) => {
                            return `@method static \\Illuminate\\Database\\Eloquent\\Builder|${cls} ${method}()`;
                        },
                    ),
                )
                .concat(
                    model.relations.map((relation) =>
                        getRelationBlocks(relation),
                    ),
                )
                .flat()
                .map((block) => ` * ${block}`)
                .sort((a, b) => {
                    if (a.includes("@property-read")) {
                        if (b.includes("@property")) {
                            return 1;
                        }

                        if (b.includes("@method")) {
                            return -1;
                        }

                        return 0;
                    }

                    if (a.includes("@property")) {
                        return -1;
                    }

                    return 0;
                }),
        };
    });

    const namespaced: {
        // TODO: Fix any type
        [namespace: string]: any[];
    } = {};

    blocks.forEach((block) => {
        if (!namespaced[block.namespace]) {
            namespaced[block.namespace] = [];
        }

        namespaced[block.namespace].push(block);
    });

    const finalContent = Object.entries(namespaced).map(
        ([namespace, blocks]) => {
            return [
                `namespace ${namespace} {`,
                ...blocks.map((block) => classToDocBlock(block, namespace)),
                "",
                "}",
            ].join("\n\n");
        },
    );

    finalContent.unshift("<?php");

    fs.writeFileSync(
        projectPath(`vendor/_laravel_ide/_model_helpers.php`),
        finalContent.join("\n\n"),
    );
};

const getRelationBlocks = (relation: Eloquent.Relation): string[] => {
    if (
        [
            "BelongsToMany",
            "HasMany",
            "HasManyThrough",
            "MorphMany",
            "MorphToMany",
        ].includes(relation.type)
    ) {
        return [
            `@property-read \\Illuminate\\Database\\Eloquent\\Collection<int, \\${relation.related}> $${relation.name}`,
            `@property-read int|null $${relation.name}_count`,
        ];
    }

    return [`@property-read \\${relation.related} $${relation.name}`];
};

const classToDocBlock = (block: any, namespace: string) => {
    return [
        `/**`,
        ` * ${namespace}\\${block.className}`,
        " *",
        ...block.blocks,
        " */",
        `class ${block.className} extends \\Illuminate\\Database\\Eloquent\\Model`,
        `{`,
        indent("//"),
        `}`,
    ]
        .map((b) => indent(b))
        .join("\n");
};

const getAttributeBlocks = (
    attr: Eloquent.Attribute,
    className: string,
): string[] => {
    const blocks = [];

    const propType = ["accessor", "attribute"].includes(attr.cast || "")
        ? "@property-read"
        : "@property";

    const type = getAttributeType(attr);

    blocks.push(`${propType} ${type} $${attr.name}`);

    if (!["accessor", "attribute"].includes(attr.cast || "")) {
        blocks.push(
            `@method static \\Illuminate\\Database\\Eloquent\\Builder|${className} where${attr.title_case}($value)`,
        );
    }

    return blocks;
};

const getAttributeType = (attr: Eloquent.Attribute): string => {
    const type = getActualType(attr.cast || attr.type);

    return attr.nullable ? `${type}|null` : type;
};

const getActualType = (type: string): string => {
    const mapping: {
        [key: string]: string;
    } = {
        datetime: "\\Illuminate\\Support\\Carbon",
        "boolean(1)": "bool",
        "boolean(0)": "bool",
        text: "string",
        integer: "int",
        attribute: "mixed",
        accessor: "mixed",
        "encrypted:json": "array",
        "encrypted:array": "array",
        "encrypted:collection": "\\Illuminate\\Support\\Collection",
        "encrypted:object": "object",
        encrypted: "mixed",
    };

    const finalType = mapping[type] || type;

    if (finalType.includes("\\") && !finalType.startsWith("\\")) {
        return `\\${finalType}`;
    }

    return finalType;
};
