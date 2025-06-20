import { Env, Type } from "./base";
import { EnumType } from "./enum";

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
            get: async (env: Env, obj: Type<string>, args: Type<any>[]) => {
                const index = obj.getValue();
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