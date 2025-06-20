import { ASTNode, FunctionDecNode } from "../parser/ast";
import {  Module } from "../types";
import { Env, Type } from "./base";

export class FunctionType extends Type<FunctionDecNode> {
    constructor(
        value: FunctionDecNode,
        public module: Module | null = null,
    ) {
        super("function", value, {
            async str(env: Env) {
                return `[Function: ${value.identifier.name}]`
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