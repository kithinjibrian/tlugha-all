import { ASTNode } from "../types";

export class ASTCache {
    private static instances: Map<unknown, ASTCache> = new Map();
    private ast: Map<string, ASTNode> = new Map();

    private constructor() { }

    public static get_instance(key: unknown = 'default'): ASTCache {
        if (!this.instances.has(key)) {
            this.instances.set(key, new ASTCache());
        }
        return this.instances.get(key)!;
    }

    public add_ast(path: string, ast: ASTNode): void {
        this.ast.set(path, ast);
    }

    public get_ast(path: string): ASTNode | undefined {
        return this.ast.get(path);
    }

    public has_ast(path: string): boolean {
        return this.ast.has(path);
    }

    public clear_cache(): void {
        this.ast.clear();
    }
}
