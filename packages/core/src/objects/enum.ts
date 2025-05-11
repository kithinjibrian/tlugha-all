import { ASTNode, BlockNode, BoolType, Engine, Frame, FunctionDecNode, FunctionType, IdentifierNode, MemberDecNode, MemberType, NumberNode, NumberType, ReturnNode, TupleType } from "../types";
import { Env, Type } from "./base";


let m: Record<string, any> = {
    async __index__(env: Env, value: Type<any>, args: any[]) {
        const frame = new Frame();

        await env.engine.execute_function(
            args[0],
            [value, args[1]],
            frame
        );

        return frame.stack.pop();
    }
}

export class EnumType extends Type<Type<any>> {
    public members: Map<string, FunctionDecNode | MemberDecNode> = new Map();
    constructor(
        public tag: string,
        value: any,
        members?: Array<FunctionDecNode | MemberDecNode>
    ) {
        super("enum", value, {
            str: async () => `${tag}${!(value instanceof NumberType) ? await value.str() : ''}`,
            getValue: () => {
                return value;
            },
            eq: async (env: Env, obj: Type<any>) => {
                if (obj instanceof EnumType) {
                    if (obj.tag == tag) {
                        return new BoolType(true)
                    }
                }
                return new BoolType(false)
            },
            neq: async (env: Env, obj: Type<any>) => {
                return await(await this.eq(env, obj)).not(env);
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                // console.log(index, this.members);

                if (this.members.has(index)) {
                    const mem = this.members.get(index)
                    if (mem !== undefined) {
                        if (mem instanceof MemberDecNode) {
                            args.unshift(this)
                        }
                        return new MemberType(mem);
                    }
                } else {
                    let i = this.members.get("__index__");

                    if (i) {
                        return await m["__index__"](env, this, [i, obj]);
                    }

                    throw new Error(`Field '${index}' doesn't exist on struct '${name}'`)
                }
            }
        });

        if (members) {
            members.map(m => {
                this.members.set(m.identifier.name, m);
            })
        }
    }

    *[Symbol.iterator]() {
        yield this;
    }
}