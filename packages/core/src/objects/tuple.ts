import { BlockNode, BooleanNode, Engine, FunctionDecNode, FunctionType, IdentifierNode, ReturnNode } from "../types";
import { Env, Type } from "./base";
import { EnumType } from "./enum";

let m: Record<string, any> = {
    is_empty(env: Env, value: any[]) {
        if (value.length == 0)
            return new BooleanNode(null, true);
        return new BooleanNode(null, false);
    }
}

export class TupleType extends Type<Type<any>[]> {
    constructor(value: Type<any>[]) {
        super("tuple", value, {
            str: async (env: Env) => {
                const strings = await Promise.all(value.map(async v => await v.str(env)));
                return `(${strings.join(", ")})`;
            },
            getValue: () => {
                return value.map(i => {
                    return i instanceof EnumType ? i : i.getValue();
                })
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (obj.type == "string") {
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
                value[idx] = newValue;  // Set the new value at the specified index
            }
        });
    }

    *[Symbol.iterator]() {
        for (let i of this.value) {
            yield i;
        }
    }
}