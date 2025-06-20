import { id, Serializer } from "../types";
import { EEnv } from "./env";

export class Module {
    public parent: Module | null = null;
    public children: Module[] = [];
    public env: EEnv;
    public __id: string = id(26);
    public path: string[] = [];

    constructor(
        public name: string,
        parent_env: EEnv | null = null,
        public tag: string = "",
        public is_prologue: boolean = false
    ) {
        this.path.push(name);
        this.env = new EEnv(parent_env, `${this.name}_env`);
    }

    toJSON(serializer: Serializer): any {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "module",
            value: {
                name: this.name,
                tag: this.tag,
                is_prologue: this.is_prologue,
                children: serializer.to_json(this.children),
                env: serializer.to_json(this.env),
                parent: serializer.to_json(this.parent),
            }
        }
    }

    static from_json(value: any) {
        const {
            name,
            tag,
            is_prologue,
            children,
            parent,
            env,
        } = value;

        const new_module = new Module(
            name,
            null,
            tag,
            is_prologue
        );

        if (parent) {
            new_module.parent = parent;
        }

        new_module.env = env;
        new_module.children = children;

        return new_module
    }

    add_submodule(child: Module): void {
        if (!child.parent) {
            child.parent = this;

            const path = [...this.path, child.name];
            child.path = path;

            if (!child.is_prologue)
                child.is_prologue = this.is_prologue;
        }

        this.children.push(child);
    }

    get_path(): string {
        return this.path.join("::");
    }
}

export class EnumModule extends Module {
    constructor(
        public name: string,
        env: EEnv | null = null,
    ) {
        super(name, env)
    }
}

export class StructModule extends Module {
    constructor(
        public name: string,
        env: EEnv | null = null,
    ) {
        super(name, env)
    }
}