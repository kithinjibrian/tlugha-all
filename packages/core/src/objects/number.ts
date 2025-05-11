import {
    BlockNode,
    Engine,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    ReturnNode
} from "../types";
import { Env, Type } from "./base";
import { BoolType } from "./bool";
import { FunctionType } from "./function";

let m: Record<string, any> = {
    sqrt(value: number) {
        return Math.sqrt(value);
    },
    abs(value: number) {
        return Math.abs(value);
    },
    ceil(value: number) {
        return Math.ceil(value);
    },
    floor(value: number) {
        return Math.floor(value);
    },
    round(value: number) {
        return Math.round(value);
    },
    trunc(value: number) {
        return Math.trunc(value);
    },
    pow(value: number, args: number[]) {
        return Math.pow(value, args[0]);
    },
}

export class NumberType extends Type<number> {
    constructor(value: number) {
        super("number", value, {
            add: async (env: Env, obj: Type<number>) => new NumberType(value + obj.getValue()),
            minus: async (env: Env, obj: Type<number>) => new NumberType(value - obj.getValue()),
            multiply: async (env: Env, obj: Type<number>) => new NumberType(value * obj.getValue()),
            divide: async (env: Env, obj: Type<number>) => {
                const divisor = obj.getValue();
                if (divisor === 0) throw new Error("Cannot divide by zero");
                return new NumberType(value / divisor);
            },
            modulo: async (env: Env, obj: Type<number>) => new NumberType(value % obj.getValue()),
            lt: async (env: Env, obj: Type<number>) => new BoolType(value < obj.getValue()),
            gt: async (env: Env, obj: Type<number>) => new BoolType(value > obj.getValue()),
            lte: async (env: Env, obj: Type<number>) => new BoolType(value <= obj.getValue()),
            gte: async (env: Env, obj: Type<number>) => new BoolType(value >= obj.getValue()),
            eq: async (env: Env, obj: Type<number>) => new BoolType(value === obj.getValue()),
            neq: async (env: Env, obj: Type<number>) => new BoolType(value !== obj.getValue()),
            get: async (env: Env, prop: Type<string>, args: Type<any>[]) => {
                const _prop = prop.getValue();
                const methods = ["sqrt", "abs", "ceil", "floor", "round", "trunc", "pow"];

                if (!methods.find((method) => method == _prop)) {
                    throw new Error(`The number object lacks method: '${_prop}'`)
                }

                return new FunctionType(
                    new FunctionDecNode(
                        null,
                        new IdentifierNode(null, _prop),
                        undefined,
                        new BlockNode(null, [
                            new ReturnNode(
                                null,
                                new NumberNode(null, m[_prop](value, args.map((val) => val.getValue())))
                            )
                        ])
                    )
                );
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}