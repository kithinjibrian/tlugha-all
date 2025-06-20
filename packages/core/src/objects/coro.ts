import { ASTNode, FunctionDecNode } from "../parser/ast";
import {  MethodType, Module, parse, Thread, XM_Frame, XMachina } from "../types";
import { Env, Type } from "./base";

export class CoroType extends Type<any> {
    constructor(
        value: any,
        public xmachina: XMachina,
        public thread: Thread,
    ) {
        super("coro", value, {
            async str(env: Env) {
                return `[Function: ${value.identifier.name}]`
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (index >= 0 && index < value.length) {
                    return value[index];
                }
            }
        });
    }

    toJSON() {
        return {
            type: this.type,
            identifier: this.value.identifier.name,
        }
    }

    *[Symbol.iterator]() {
        yield this;
    }
}