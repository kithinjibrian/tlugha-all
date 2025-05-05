import {
    ArrayNode,
    BlockNode,
    BoolType,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    ReturnNode,
    StringNode,
} from "../types";
import { Type } from "./base";
import { FunctionType } from "./function";

let m: Record<string, any> = {
    length(value: string) {
        return new NumberNode(value.length);
    },
    split(value: string, args: string[]) {
        return new ArrayNode(
            value.split(args[0]).map((ch) => new StringNode(ch))
        )
    }
}

export class StringType extends Type<string> {
    constructor(value: string) {
        super("string", value, {
            add: (obj: Type<string>) => new StringType(value + obj.getValue()),
            eq: (obj: Type<string>) => new BoolType(value === obj.getValue()),
            str: () => `"${value}"`,
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
            }
        });
    }
}