import { Module } from "../types";

export class Cache {
    private static instance: Cache | null = null;
    private mods: Map<string, any> = new Map();

    private constructor() { }

    public static get_instance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    public add_mod(path: string, mod: Module): void {
        this.mods.set(path, mod);
    }

    public get_mod(path: string): Module {
        return this.mods.get(path);
    }

    public has_mod(path: string): boolean {
        return this.mods.has(path);
    }

    public clear_cache(): void {
        this.mods.clear();
    }
}
