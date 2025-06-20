import {
    MethodType,
} from "../types";
import { Env, Type } from "./base";
import { EnumType } from "./enum";

export class ArrayType extends Type<Type<any>[]> {
    public index: number = 0;
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

                if (index >= 0 && index < value.length) {
                    return value[index];
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