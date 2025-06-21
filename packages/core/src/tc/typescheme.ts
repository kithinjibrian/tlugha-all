import { EEnv } from "../types";
import { global_counter } from "./gen";
import { Subst } from "./subst";
import { Type, TypeVariable } from "./tc_type";

export class TypeScheme {
    constructor(
        public vars: string[],
        public type: Type
    ) { }

    toString() {
        return `forall ${this.vars.join(', ')} . ${this.type}`;
    }

    instantiate() {
        if (this.vars.length === 0) {
            return this.type;
        }

        const subst = new Subst();

        for (const v of this.vars) {
            subst.set(
                new TypeVariable(v),
                new TypeVariable(`TVAR${global_counter.next().value}`)
            );
        }

        return this.type.substitute(subst);
    }

    substitute(subst: Subst): TypeScheme {
        const s = new Subst(subst);

        for (const v of this.vars) {
            s.delete(v);
        }

        return new TypeScheme(
            this.vars,
            this.type.substitute(s)
        )
    }

    static free_types_in_env(e: EEnv) {
        const vars = new Set<string>();

        let current: EEnv | null = e;

        while (current) {
            for (const scheme of current.symbol_table.values()) {
                const $ = scheme as TypeScheme;

                const typevars = $.type.freeTypeVars();
                const quantified = new Set($.vars);

                for (const t of typevars) {
                    if (!quantified.has(t)) {
                        vars.add(t);
                    }
                }
            }

            current = current.parent;
        }

        return vars;
    }

    static generalize(type: Type, e: EEnv) {
        const t = type.freeTypeVars();
        const f = TypeScheme.free_types_in_env(e);
        const vars = Array.from(t).filter(t => !f.has(t));

        return new TypeScheme(vars, type);
    }
}