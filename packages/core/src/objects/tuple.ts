import { Env, Type } from "./base";
import { EnumType } from "./enum";

export class TupleType extends Type<Type<any>[]> {
    constructor(value: Type<any>[]) {
        super("tuple", value, {
            getValue: () => {
                return value.map(i => {
                    return i instanceof EnumType ? i : i.getValue();
                })
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
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