import { Engine } from "../types";
import { Env, Type } from "./base";
import { BoolType } from "./bool";
import { FunctionType } from "./function";
import { MemberType } from "./member";
import { NumberType } from "./number";

export class StructType extends Type<Record<string, Type<any>>> {
    public name: string;

    constructor(
        value: Record<string, Type<any>>,
        name: string = ""
    ) {
        super("struct", value, {
            getValue: () => {
                return Object.entries(value)
                    .filter(([_, val]) => !(val instanceof MemberType || val instanceof FunctionType))
                    .reduce((acc, [key, val]) => {
                        acc[key] = val.getValue();
                        return acc;
                    }, {} as Record<string, any>);
            },
            str: (indentLevel = 0) => {
                const indent = "  ".repeat(indentLevel);
                const innerIndent = "  ".repeat(indentLevel + 1);
                let result = `${indent}${name} {\n`;

                const entries = Object.entries(value).filter(
                    ([, val]) => !(val instanceof MemberType || val instanceof FunctionType)
                );

                entries.forEach(([key, val], index) => {
                    result += `${innerIndent}${key}: `;

                    if (val && typeof val === "object" && typeof val.str === "function") {
                        result += val.str(indentLevel + 1);
                    } else if (val && typeof val.getValue === "function") {
                        result += String(val.getValue());
                    } else {
                        result += String(val);
                    }

                    if (index < entries.length - 1) {
                        result += ",";
                    }

                    result += "\n";
                });

                result += `${indent}}`;
                return result;
            },
            get: (env: Env, obj: Type<string>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (value[index]) {
                    if (value[index] instanceof MemberType) {
                        args.unshift(this)
                    }
                    return value[index];
                }
                else
                    throw new Error(`Field '${index}' doesn't exist on struct '${name}'`)
            },
            set: (key: Type<string>, newValue: Type<any>) => {
                const index = key.getValue();
                if (index in value)
                    value[index] = newValue;
                else
                    throw new Error(`Field '${index}' doesn't exist on struct '${name}'`)
            }
        });

        this.name = name;
    }

    *[Symbol.iterator]() {
        yield this;
    }
}