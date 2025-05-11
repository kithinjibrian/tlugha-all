import { ASTNode, FunctionDecNode } from "../parser/ast";
import { Type } from "./base";

export class FunctionType extends Type<FunctionDecNode> {
    constructor(value: FunctionDecNode) {
        super("function", value, {
            str() {
                return `[Function: ${value.identifier}]`
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}