import { BlockNode, FunctionDecNode, IdentifierNode, ReturnNode } from "../types";
import { Env, Type } from "./base";
import { EnumType } from "./enum";
import { result } from "./result";
import { StringType } from "./string";
import { FunctionType } from "./type";

let m: Record<string, any> = {
    get(env: Env, value: any[], args: any[]) {
        const index = args[0].getValue()
        if (index in value) {
            return result(env.engine, value[index], null)
        }
        return result(env.engine, null, new StringType(`Key '${index}' doesn't exist.`));
    },
    insert(_: Env, value: any[], args: any[]) {
        const index = args[0].getValue();
        value[index] = args[1];
    }
}

export class MapType extends Type<Record<string, Type<any>>> {
    constructor(value: Record<string, Type<any>>) {
        super("map", value, {
            getValue: () => {
                return Object.entries(value).reduce((acc, [key, val]) => {
                    if (val instanceof EnumType) {
                        acc[key] = val;
                    } else {
                        acc[key] = val.getValue();
                    }
                    return acc;
                }, {} as Record<string, any>);
            },
            str: async (env: Env, indentLevel = 0) => {
                let result = "map {\n";
                const indent = "  ".repeat(indentLevel + 1);
                const entries = Object.entries(value);

                for (let i = 0; i < entries.length; i++) {
                    const [key, val] = entries[i];
                    result += `${indent}${key}: `;

                    if (val && typeof val === "object" && val.str) {
                        result += await val.str(env, indentLevel + 1);
                    } else {
                        result += val.str ? await val.str(env) : String(val.getValue());
                    }

                    if (i < entries.length - 1) {
                        result += ",\n";
                    }
                }

                result += "\n" + "  ".repeat(indentLevel) + "}";
                return result;
            },
            get: async (env: Env, obj: Type<string>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (!(index in m)) {
                    throw new Error(`Method '${index}' doesn't exist for a map object.'`)
                }

                return new FunctionType(
                    new FunctionDecNode(
                        null,
                        new IdentifierNode(null, index),
                        undefined,
                        new BlockNode(null, [
                            new ReturnNode(
                                null,
                                await m[index](env, value, args)
                            )
                        ])
                    )
                );
            },
            set: async (env: Env, key: Type<string>, newValue: Type<any>) => {
                const index = key.getValue();
                value[index] = newValue;
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}