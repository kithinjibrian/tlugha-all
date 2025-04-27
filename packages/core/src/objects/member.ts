import { MemberDecNode } from "../parser/ast";
import { Type } from "./base";

export class MemberType extends Type<MemberDecNode> {
    constructor(value: MemberDecNode) {
        super("member", value, {
            str() {
                return `[Member: ${value.identifier}]`
            }
        });
    }
}