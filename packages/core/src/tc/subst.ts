import { Type, TypeVariable } from "./tc_type";

export class Subst {
    public subst: Map<string, Type>;

    constructor(
        def?: Subst
    ) {
        this.subst = def ? new Map<string, Type>(def.subst) : new Map<string, Type>();
    }

    public set(t1: TypeVariable, t2: Type) {
        this.subst.set(t1.name, t2);
    }

    public get(t1: TypeVariable): Type | undefined {
        return this.subst.get(t1.name);
    }

    public delete(name: string) {
        this.subst.delete(name);
    }

    public compose(other: Subst): Subst {
        const result = new Subst();

        // Apply other to our substitutions
        for (const [var_, type] of this.subst) {
            result.set(new TypeVariable(var_), type.substitute(other));
        }

        // Add other's substitutions that we don't have
        for (const [var_, type] of other.subst) {
            if (!result.subst.has(var_)) {
                result.set(new TypeVariable(var_), type);
            }
        }

        return result;
    }

    toString(): string {
        const entries = Array.from(this.subst.entries())
            .map(([k, v]) => `${k} ↦ ${v}`)
            .join(', ');
        return `{${entries}}`;
    }

    isEmpty(): boolean {
        return this.subst.size === 0;
    }

    entries(): IterableIterator<[string, Type]> {
        return this.subst.entries();
    }
}

let global_subst = new Subst();

export function get_global_subst() {
    return global_subst;
}

export function set_global_subst(subst: Subst) {
    global_subst = subst;
}