import {
    AlreadyInitNode,
    ASTNode,
    BooleanNode,
    FunctionDecNode,
    LambdaNode,
    LambdaType,
    MapNode,
    NumberNode,
    PropertyNode,
    SetNode,
    StringNode,
    TaggedNode,
    TupleNode,
    TupleVariantNode
} from "../types";

import { ArrayType } from "./array";
import { Type } from "./base";
import { BoolType } from "./bool";
import { DateType } from "./date";
import { EnumType } from "./enum";
import { MapType } from "./map";
import { NumberType } from "./number";
import { StringType } from "./string";

export function create_node(value: Type<any>, to_tuple_variant: boolean = false): ASTNode {
    switch (value.type) {
        case "number":
        case "bool":
        case "string":
        case "set":
        case "array":
        case "map":
        case "struct": {
            return new AlreadyInitNode(value)
        }
        case "enum": {
            const _enum = value as EnumType;
            return new TaggedNode(
                null,
                _enum.tag,
                create_node(_enum.getValue(), true),
                Array.from(_enum.members, ([key, val]) => {
                    return val
                })
            )
        }
        case "tuple": {
            const tuple = [];

            for (let val of value) {
                tuple.push(create_node(val));
            }

            if (to_tuple_variant)
                return new TupleVariantNode(null, tuple);

            return new TupleNode(null, tuple);
        }
        case "function": {
            let fun = value.getValue() as FunctionDecNode;
            return fun
        }
    }

    throw new Error(`Unknown object type: '${value.type}'`)
}

export function create_object(value: any): Type<any> {
    if (value === null) {
        throw new Error("Null values are not supported");
    }

    if (value instanceof Type) {
        return value
    }

    if (value instanceof LambdaNode) {
        return new LambdaType(value);
    }

    if (typeof value == "number") {
        return new NumberType(value);
    } else if (typeof value == "string") {
        return new StringType(value);
    } else if (typeof value == "boolean") {
        return new BoolType(value);
    } else if (typeof value == "object") {
        if (Array.isArray(value)) {
            return new ArrayType(value.map(v => create_object(v)))
        } else if (value instanceof Date) {
            return new DateType(value)
        } else {
            return new MapType(Object.entries(value).reduce((acc, [key, val]) => {
                acc[key] = create_object(val);
                return acc;
            }, {} as Record<string, Type<any>>));
        }
    }

    throw new Error(`Unsupported data type: ${typeof value}`);
}