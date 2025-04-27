import {
    BlockNode,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    ReturnNode,
    StringNode,
} from "../types";
import { Type } from "./base";
import { create_node, create_object } from "./create";
import { FunctionType } from "./function";

let m: Record<string, any> = {
    length(value: any[]) {
        return new NumberNode(value.length);
    },
    pop(value: Type<any>[]) {
        const v = value.pop();
        if (v)
            return create_node(v)
    },
    push(value: Type<any>[], args: any[]) {
        value.push(create_object(args[0]));
    },
    join(value: any[]) {
        return new StringNode(
            value.map(v => v.getValue()).join("")
        )
    }
}

export class ArrayType extends Type<Type<any>[]> {
    constructor(value: Type<any>[]) {
        super("array", value, {
            str: () => `[${value.map(v => v.str()).join(", ")}]`,
            getValue: () => {
                return value.map(i => {
                    return i.getValue();
                })
            },
            get: (obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (obj.type == "string") {
                    return new FunctionType(
                        new FunctionDecNode(
                            new IdentifierNode(index),
                            undefined,
                            new BlockNode([
                                new ReturnNode(
                                    m[index](value, args.map((val) => val.getValue()))
                                )
                            ])
                        )
                    );
                } else {
                    if (index >= 0 && index < value.length) {
                        return value[index];
                    }
                    throw new Error(`Index ${index} out of bounds`);
                }
            },
            set: (index: Type<number>, newValue: Type<any>) => {
                const idx = index.getValue();
                if (idx < 0 || idx >= value.length) {
                    throw new Error(`Index ${idx} out of bounds`);
                }
                value[idx] = newValue;  // Set the new value at the specified index
            }
        });
    }
}