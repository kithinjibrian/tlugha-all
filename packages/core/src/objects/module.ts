import { Module } from "../types";
import { Env, Type } from "./base";

export class ModuleType extends Type<Module> {
    constructor(value: Module) {
        super("module", value, {
            async str(env: Env) {
                return `[Module: ${value.name}]`
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}