import { FatMap } from "../fats/map";
import { FunctionDecNode, Serializer } from "../types";
import { Env, Type } from "./base";


export class EnumType extends Type<Type<any>> {
    public members: FatMap<string, FunctionDecNode> = new FatMap();
    constructor(
        public tag: string,
        value: any,
        members?: Array<FunctionDecNode>
    ) {
        super("enum", value, {
            getValue: () => {
                return value;
            },
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                // console.log(index, this.members);
            }
        });

        if (members) {
            members.map(m => {
                this.members.set(m.identifier.name, m);
            })
        }
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "objects",
            value: {
                type: this.type,
                value: {
                    tag: this.tag,
                    value: this.value,
                    members: this.members
                }
            }
        }
    }

    static from_json(value: any) {
        const en = new EnumType(
            value.tag,
            value.value,
        );

        en.members = value.members;

        return en;
    }

    *[Symbol.iterator]() {
        yield this;
    }
}