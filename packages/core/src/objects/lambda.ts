import { LambdaNode } from "../parser/ast";
import { Type } from "./base";

export class LambdaType extends Type<LambdaNode> {
    constructor(value: LambdaNode) {
        super("function", value, {
            str() {
                return `[Function: Anonymous]`
            }
        });
    }
}