import {
    BlockNode,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    ReturnNode,
} from "../types";
import { Type } from "./base";
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
            add: (obj: Type<number>) => new NumberType(value + obj.getValue()),
            minus: (obj: Type<number>) => new NumberType(value - obj.getValue()),
            multiply: (obj: Type<number>) => new NumberType(value * obj.getValue()),
            divide: (obj: Type<number>) => {
                const divisor = obj.getValue();
                if (divisor === 0) throw new Error("Cannot divide by zero");
                return new NumberType(value / divisor);
            },
            inc: () => new NumberType(value++),
            dec: () => new NumberType(value--),
            modulo: (obj: Type<number>) => new NumberType(value % obj.getValue()),
            lt: (obj: Type<number>) => new BoolType(value < obj.getValue()),
            gt: (obj: Type<number>) => new BoolType(value > obj.getValue()),
            eq: (obj: Type<number>) => new BoolType(value === obj.getValue()),
            neq: (obj: Type<number>) => new BoolType(value !== obj.getValue()),
            get: (prop: Type<string>, args: Type<any>[]) => {
                const _prop = prop.getValue();
                const methods = ["sqrt", "abs", "ceil", "floor", "round", "trunc", "pow"];

                if (!methods.find((method) => method == _prop)) {
                    throw new Error(`The number object lacks method: '${_prop}'`)
                }

                return new FunctionType(
                    new FunctionDecNode(
                        new IdentifierNode(_prop),
                        undefined,
                        new BlockNode([
                            new ReturnNode(
                                new NumberNode(m[_prop](value, args.map((val) => val.getValue())))
                            )
                        ])
                    )
                );
            }
        });
    }
}