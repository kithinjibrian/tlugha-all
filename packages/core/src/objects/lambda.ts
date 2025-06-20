import { LambdaNode } from "../parser/ast";
import {  Module } from "../types";
import { Env, Type } from "./base";

export class LambdaType extends Type<LambdaNode> {
    constructor(
        value: LambdaNode,
        public module: Module | null = null,
        public env: any | null = null
    ) {
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