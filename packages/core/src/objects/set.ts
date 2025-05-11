import { Env, Type } from "./base";
import { EnumType } from "./enum";

export class SetType extends Type<Type<any>[]> {
    constructor(value: Type<any>[]) {
        super("set", value, {
            str: async (env: Env) => {
                const strings = await Promise.all(value.map(async v => await v.str(env)));
                return `set {${strings.join(", ")}}`;
            },
            getValue: () => {
                return value.map(i => {
                    return i instanceof EnumType ? i : i.getValue();
                })
            },
            get: async (env: Env, obj: Type<number>) => {
                const index = obj.getValue();
                if (index >= 0 && index < value.length) {
                    return value[index];
                }
                throw new Error(`Index ${index} out of bounds`);
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