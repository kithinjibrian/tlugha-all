import { ASTNode, FunctionDecNode } from "../parser/ast";
import { Env, Type } from "./base";

export class FunctionType extends Type<FunctionDecNode> {
    constructor(value: FunctionDecNode) {
        super("function", value, {
            async str(env: Env) {
                return `[Function: ${value.identifier}]`
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}