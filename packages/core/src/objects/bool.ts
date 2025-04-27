import { Type } from "./base";

export class BoolType extends Type<boolean> {
    constructor(value: boolean) {
        super("bool", value, {});
    }
}