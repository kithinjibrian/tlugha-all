import { MemberDecNode } from "../parser/ast";
import { Env, Type } from "./base";

export class MemberType extends Type<MemberDecNode> {
    constructor(value: MemberDecNode) {
        super("member", value, {
            async str(env: Env) {
                return `[Member: ${value.identifier}]`
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}