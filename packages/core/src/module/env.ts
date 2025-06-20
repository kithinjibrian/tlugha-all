import { FatMap } from "../fats/map";
import { id, Serializer } from "../types";

export abstract class OGEnv {
    public __id: string = id(26);
    public __sym_id: string = id(26);

    constructor(
        public name: string = "",
        public parent: OGEnv | null = null,
        public symbol_table: FatMap<string, any> = new FatMap(),
    ) { }

    toJSON(serializer: Serializer): any {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "env",
            value: serializer.to_json(this.symbol_table)
        }
    }

    define(name: string, value: any) {
        this.symbol_table.set(name, value);
    }

    get(name: string): any {
        if (this.symbol_table.has(name)) {
            return this.symbol_table.get(name);
        }
        if (this.parent) {
            return this.parent.get(name); // Lexical scoping
        }

        return null;
    }

    assign(name: string, value: any) {
        if (this.symbol_table.has(name)) {
            this.symbol_table.set(name, value);
        } else if (this.parent) {
            this.parent.assign(name, value);
        } else {
            throw new Error(`Undefined variable: ${name}`);
        }
    }

    abstract clone(): any
}


export class EEnv extends OGEnv {
    constructor(
        parent: EEnv | null = null,
        name: string = ""
    ) {
        super(name, parent);
    }

    clone() {
        const parent = this.parent ? this.parent.clone() : null;
        const env = new EEnv(parent, this.name);

        env.symbol_table = new FatMap([...this.symbol_table]);

        return env;
    }

    static from_json(value: any): EEnv | null {

        if (value == undefined) return null;

        const new_env = new EEnv();
        new_env.name = value.name;
        new_env.parent = value.parent;
        new_env.symbol_table = value.symbol_table;

        return new_env;
    }
}