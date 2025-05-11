import { Type } from "./base";

export class BoolType extends Type<boolean> {
    constructor(value: boolean) {
        super("bool", value, {
            and: (obj: Type<boolean>) => new BoolType(value && obj.getValue()),
            or: (obj: Type<boolean>) => new BoolType(value || obj.getValue()),
            eq: (obj: Type<boolean>) => new BoolType(value === obj.getValue()),
            neq: (obj: Type<boolean>) => new BoolType(value !== obj.getValue()),
            not: () => new BoolType(!value),
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}