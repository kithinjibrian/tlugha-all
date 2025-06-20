import {   Serializer } from "../types";
import { Env, Type } from "./base";

export class StructType extends Type<Record<string, Type<any>>> {
    public name: string;

    constructor(
        value: Record<string, Type<any>>,
        name: string = ""
    ) {
        super("struct", value, {
            getValue: () => {
            },
            get: async (env: Env, obj: Type<string>, args: Type<any>[]) => {
                throw new Error(`Field '${"index"}' doesn't exist on struct '${name}'`)
            },
            set: async (env: Env, key: Type<string>, newValue: Type<any>) => {
                const index = key.getValue();
                if (index in value)
                    value[index] = newValue;
                else
                    throw new Error(`Field '${index}' doesn't exist on struct '${name}'`)
            }
        });

        this.name = name;
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "objects",
            value: {
                type: this.type,
                value: {
                    name: this.name,
                    fields: this.value
                }
            }
        }
    }

    static from_json(value: any) {
        return new StructType(value.fields, value.name);
    }

    *[Symbol.iterator]() {
        yield this;
    }
}