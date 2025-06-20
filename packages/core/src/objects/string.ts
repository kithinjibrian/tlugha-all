import { Env, Type } from "./base";

export class StringType extends Type<string> {
    constructor(value: string) {
        super("string", value, {
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}