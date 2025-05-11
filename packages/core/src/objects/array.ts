import {
    ArrayNode,
    ASTNode,
    BlockNode,
    Frame,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    option,
    result,
    ReturnNode,
    StringNode,
    StringType,
} from "../types";
import { Env, Type } from "./base";
import { create_node } from "./create";
import { EnumType } from "./enum";
import { FunctionType } from "./function";

let m: Record<string, any> = {
    at(env: Env, value: any[], args: any[]) {
        const index = args[0].getValue()
        if (index >= 0 && index < value.length) {
            return result(env.engine, value[index], null)
        }
        return result(env.engine, null, new StringType(`Index '${index}' is out of bounds.`));
    },
    length(env: Env, value: any[]) {
        return new NumberNode(null, value.length);
    },
    peek(env: Env, value: Type<any>[]) {
        return result(env.engine, value[value.length - 1], new StringType(`Can't peek an empty array`));
    },
    pop(env: Env, value: Type<any>[]) {
        return result(env.engine, value.pop(), new StringType(`Can't pop an empty array`));
    },
    push(_: Env, value: Type<any>[], args: any[]) {
        value.push(args[0]);
    },
    shift(env: Env, value: Type<any>[]) {
        return result(env.engine, value.shift(), new StringType(`Can't shift an empty array`));
    },
    unshift(_: Env, value: Type<any>[], args: any[]) {
        value.unshift(args[0]);
    },
    join(_: Env, value: any[], args: any[]) {
        return new StringNode(
            null,
            value.map(v => v.getValue()).join(args[0].getValue())
        )
    },
    enumerate(_: Env, value: Type<any>[]) {
        const result: ASTNode[] = [];

        for (let i = 0; i < value.length; i++) {
            const pair = new ArrayNode(null, [
                new NumberNode(null, i),
                create_node(value[i])
            ]);
            result.push(pair);
        }

        return new ArrayNode(null, result);
    },
    async map(env: Env, value: Type<any>[], args: any[]) {
        const new_arr: ASTNode[] = [];

        await Promise.all(
            value.map(async (v, i) => {
                const frame = new Frame();

                await env.engine.execute_function(
                    args[0].getValue(),
                    [v],
                    frame
                );

                const res = frame.stack.pop();

                if (res) {
                    new_arr.push(create_node(res));
                }
            })
        );

        return new ArrayNode(
            null,
            new_arr
        );
    },
    filter: async (env: Env, value: Type<any>[], args: any[]) => {
        const result: ASTNode[] = [];

        for (let i = 0; i < value.length; i++) {
            const frame = new Frame();

            await env.engine.execute_function(
                args[0].getValue(),
                [value[i]],
                frame
            );

            const condition = frame.stack.pop();
            if (condition?.getValue?.()) {
                result.push(create_node(value[i]));
            }
        }

        return new ArrayNode(null, result);
    },
    reduce: async (env: Env, value: Type<any>[], args: any[]) => {
        if (value.length === 0) return 0;

        const callback = args[0].getValue();
        let acc: any;
        let startIndex: number;

        if (args.length > 1) {
            acc = args[1];
            startIndex = 0;
        } else {
            acc = value[0];
            startIndex = 1;
        }

        for (let i = startIndex; i < value.length; i++) {
            const frame = new Frame();

            await env.engine.execute_function(
                callback,
                [acc, value[i]],
                frame
            );

            acc = frame.stack.pop();
        }

        return acc ? create_node(acc) : new NumberNode(null, 0);
    }
}

export class ArrayType extends Type<Type<any>[]> {
    constructor(value: Type<any>[]) {
        super("array", value, {
            str: async (env: Env) => {
                const strings = await Promise.all(value.map(async v => await v.str(env)));
                return `[${strings.join(", ")}]`;
            },
            getValue: () => {
                return value.map(i => {
                    return i instanceof EnumType ? i : i.getValue();
                })
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (obj.type == "string") {

                    if (!(index in m)) {
                        throw new Error(`Method '${index}' doesn't exist for a array object.'`)
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
                } else {
                    if (index >= 0 && index < value.length) {
                        return value[index];
                    }
                    throw new Error(`Index ${index} out of bounds`);
                }
            },
            set: async (env: Env, index: Type<number>, newValue: Type<any>) => {
                const idx = index.getValue();
                if (idx < 0 || idx >= value.length) {
                    throw new Error(`Index ${idx} out of bounds`);
                }
                value[idx] = newValue;
            }
        });
    }

    *[Symbol.iterator]() {
        for (let i of this.value) {
            yield i;
        }
    }
}