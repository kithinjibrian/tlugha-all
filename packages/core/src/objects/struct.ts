import { Frame, NumberType } from "../types";
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
            minus: async (env: Env, obj: Type<any>) => {
                if ("__minus__" in value) {
                    const frame = new Frame();

                    const fun = value["__minus__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'minus' not supported for struct '${name}'`);
            },
            multiply: async (env: Env, obj: Type<any>) => {
                if ("__multiply__" in value) {
                    const frame = new Frame();

                    const fun = value["__multiply__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'multiply' not supported for struct '${name}'`);
            },
            divide: async (env: Env, obj: Type<any>) => {
                if ("__divide__" in value) {
                    const frame = new Frame();

                    const fun = value["__divide__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'divide' not supported for struct '${name}'`);
            },
            modulo: async (env: Env, obj: Type<any>) => {
                if ("__modulo__" in value) {
                    const frame = new Frame();

                    const fun = value["__modulo__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'modulo' not supported for struct '${name}'`);
            },
            lt: async (env: Env, obj: Type<any>) => {
                if ("__lt__" in value) {
                    const frame = new Frame();

                    const fun = value["__lt__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'lt' not supported for struct '${name}'`);
            },
            gt: async (env: Env, obj: Type<any>) => {
                if ("__gt__" in value) {
                    const frame = new Frame();

                    const fun = value["__gt__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'gt' not supported for struct '${name}'`);
            },
            lte: async (env: Env, obj: Type<any>) => {
                if ("__lte__" in value) {
                    const frame = new Frame();

                    const fun = value["__lte__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'lte' not supported for struct '${name}'`);
            },
            gte: async (env: Env, obj: Type<any>) => {
                if ("__gte__" in value) {
                    const frame = new Frame();

                    const fun = value["__gte__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'gte' not supported for struct '${name}'`);
            },
            eq: async (env: Env, obj: Type<any>) => {
                if ("__eq__" in value) {
                    const frame = new Frame();

                    const fun = value["__eq__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'eq' not supported for struct '${name}'`);
            },
            neq: async (env: Env, obj: Type<any>) => {
                if ("__neq__" in value) {
                    const frame = new Frame();

                    const fun = value["__neq__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'neq' not supported for struct '${name}'`);
            },
            or: async (env: Env, obj: Type<any>) => {
                if ("__or__" in value) {
                    const frame = new Frame();

                    const fun = value["__or__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'or' not supported for struct '${name}'`);
            },
            and: async (env: Env, obj: Type<any>) => {
                if ("__and__" in value) {
                    const frame = new Frame();

                    const fun = value["__and__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, obj],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'and' not supported for struct '${name}'`);
            },
            not: async (env: Env) => {
                if ("__not__" in value) {
                    const frame = new Frame();

                    const fun = value["__not__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this],
                            frame
                        );

                        return frame.stack.pop();
                    }
                }

                throw new Error(`Operation 'not' not supported for struct '${name}'`);
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
                if ("__str__" in value) {
                    const frame = new Frame();

                    const fun = value["__str__"];

                    if (fun instanceof MemberType) {
                        await env.engine.execute_function(
                            fun.getValue(),
                            [this, new NumberType(indentLevel)],
                            frame
                        );

                        return frame.stack.pop().str();
                    }
                }

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