import { ASTNode, FunctionDecNode } from "../parser/ast";
import {  Module } from "../types";
import { Env, Type } from "./base";

export class MethodType extends Type<any> {
    public self: any;

    constructor(
        value: any,
    ) {
        super("method", value, {
            async str(env: Env) {
                return `[Method]`
            },
            async call(env: Env, args: Type<any>[]) {
                return value.object.get(
                    env,
                    value.property,
                    args
                );
            },
            getValue() {
                return value;
            },
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}