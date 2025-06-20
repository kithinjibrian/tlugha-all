import { ASTNode, EEnv, MetaItemNode, Module } from "../types";

export type RegArgs = {
    node: ASTNode,
    module: Module,
    env: EEnv,
    meta_item?: MetaItemNode
}

export class Registry {
    private static instance: Registry | null = null;
    private macro: Map<string, RegArgs> = new Map();

    private constructor() { }

    public static get_instance(): Registry {
        if (!Registry.instance) {
            Registry.instance = new Registry();
        }
        return Registry.instance;
    }

    public add_macro(path: string, args: RegArgs): void {
        this.macro.set(path, args);
    }

    public get_macro(path: string): RegArgs | undefined {
        return this.macro.get(path);
    }

    public has_macro(path: string): boolean {
        return this.macro.has(path);
    }

    public clear_registry(): void {
        this.macro.clear();
    }
}
