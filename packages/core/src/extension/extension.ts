import { ASTNode, Module } from "../types";

export abstract class Extension<TVisitor> {
    abstract name: string;
    abstract before_accept(node: ASTNode, visitor: TVisitor, args?: Record<string, any>): Promise<void>;
    abstract after_accept(node: ASTNode, visitor: TVisitor, args?: Record<string, any>): Promise<void>;
    abstract handle_node(node: ASTNode, visitor: TVisitor, args?: Record<string, any>): Promise<boolean | void>;
    abstract before_run(): (({ root, current }: { root: Module, current: Module }) => Promise<void>)[];
    abstract after_main({ root }: { root: Module }): Promise<any>;
}

export class ExtensionStore<TVisitor> {
    private static instances: Map<unknown, ExtensionStore<any>> = new Map();
    private extensions: Extension<TVisitor>[] = [];

    private constructor() { }

    public static get_instance<TVisitor>(key: unknown = 'default'): ExtensionStore<TVisitor> {
        if (!this.instances.has(key)) {
            this.instances.set(key, new ExtensionStore<TVisitor>());
        }
        return this.instances.get(key)!;
    }

    public register(extension: Extension<TVisitor>): void {
        if (!this.extensions.find(ext => ext.name === extension.name)) {
            this.extensions.push(extension);
        }
    }

    public get_extensions(): Extension<TVisitor>[] {
        return this.extensions;
    }

    public unregister(name: string): void {
        this.extensions = this.extensions.filter(ext => ext.name !== name);
    }
}
