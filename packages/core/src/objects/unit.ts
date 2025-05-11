import { Type } from "./base";

export class UnitType extends Type<any> {
    constructor() {
        super("unit", 0, {
            str: async () => "unit"
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}