import { Frame } from "../types";
import { Env, Type } from "./base";
import { EnumType } from "./enum";
import { FunctionType } from "./function";
import { MemberType } from "./member";

export class StructType extends Type<Record<string, Type<any>>> {
    public name: string;

    constructor(
        value: Record<string, Type<any>>,
        name: string = ""
    ) {
        super("struct", value, {
            add: async (env: Env, obj: Type<any>) => {
                if ("__add__" in value) {
                    const frame = new Frame();

                    const fun = value["__add__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'add' not supported for struct '${name}'`);
            },
            getValue: () => {
                return Object.entries(value)
                    .filter(([_, val]) => !(val instanceof MemberType || val instanceof FunctionType))
                    .reduce((acc, [key, val]) => {
                        if (val instanceof EnumType) {
                            acc[key] = val;
                        } else {
                            acc[key] = val.getValue();
                        }
                        return acc;
                    }, {} as Record<string, any>);
            },
            str: async (env: Env, indentLevel = 0) => {
                const indent = "  ".repeat(indentLevel);
                const innerIndent = "  ".repeat(indentLevel + 1);
                let result = `${indent}${name} {\n`;

                const entries = Object.entries(value).filter(
                    ([, val]) => !(val instanceof MemberType || val instanceof FunctionType)
                );

                for (let i = 0; i < entries.length; i++) {
                    const [key, val] = entries[i];
                    result += `${innerIndent}${key}: `;

                    if (val && typeof val === "object" && typeof val.str === "function") {
                        result += await val.str(env, indentLevel + 1);
                    } else if (val && typeof val.getValue === "function") {
                        result += String(val.getValue());
                    } else {
                        result += String(val);
                    }

                    if (i < entries.length - 1) {
                        result += ",";
                    }

                    result += "\n";
                }

                result += `${indent}}`;
                return result;
            },
            get: async (env: Env, obj: Type<string>, args: Type<any>[]) => {
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
            set: async (env: Env, key: Type<string>, newValue: Type<any>) => {
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