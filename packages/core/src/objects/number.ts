
import { Env, Type } from "./base";

export class NumberType extends Type<number> {
    constructor(value: number) {
        super("number", value, {
            get: async (env: Env, prop: Type<string>, args: Type<any>[]) => {
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}