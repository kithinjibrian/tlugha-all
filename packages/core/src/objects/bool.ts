import { Env, Type } from "./base";

export class BoolType extends Type<boolean> {
    constructor(value: boolean) {
        super("bool", value, {
            and: async (env: Env, obj: Type<boolean>) => new BoolType(value && obj.getValue()),
            or: async (env: Env, obj: Type<boolean>) => new BoolType(value || obj.getValue()),
            eq: async (env: Env, obj: Type<boolean>) => new BoolType(value === obj.getValue()),
            neq: async (env: Env, obj: Type<boolean>) => new BoolType(value !== obj.getValue()),
            not: async (env: Env,) => new BoolType(!value),
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}