import { Module } from "../types";

export class Cache {
    private static instances: Map<unknown, Cache> = new Map();
    private mods: Map<string, Module> = new Map();

    private constructor() { }

    public static get_instance(key: unknown = 'default'): Cache {
        if (!this.instances.has(key)) {
            this.instances.set(key, new Cache());
        }
        return this.instances.get(key)!;
    }

    public add_mod(path: string, mod: Module): void {
        this.mods.set(path, mod);
    }

    public get_mod(path: string): Module {
        const mod = this.mods.get(path);

        if (mod == undefined) {
            throw new Error("Mod doesn't exist")
        }

        return mod;
    }

    public has_mod(path: string): boolean {
        return this.mods.has(path);
    }

    public clear_cache(): void {
        this.mods.clear();
    }
}
