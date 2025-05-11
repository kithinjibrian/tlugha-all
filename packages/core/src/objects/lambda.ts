import { LambdaNode } from "../parser/ast";
import { Env, Type } from "./base";

export class LambdaType extends Type<LambdaNode> {
    constructor(value: LambdaNode) {
        super("function", value, {
            async str(env: Env) {
                return `[Function: Anonymous]`
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}