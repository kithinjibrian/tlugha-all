import { EEnv } from "../types";
import { Constraint, EqConstraint } from "./constraint";
import { Subst } from "./subst";
import { BagType, FunctionType, StructType, Type, TypeVariable } from "./tc_type";

export class TypeSolver {
    public constraints: Array<Constraint> = [];

    collect_eq(lhs: Type, rhs: Type) {
        this.constraints.push(new EqConstraint(lhs, rhs));
    }

    generalize(t: Type, e: EEnv): Type {
        return t;
    }

    bind(t1: TypeVariable, t2: Type): Subst {

        // bind type to ast
        t1.bind_to_ast(t2);

        const subst = new Subst();
        subst.set(t1, t2);
        return subst;
    }

    unify(t1: Type, t2: Type): Subst {
        // if (t1.equals(t2)) {
        //     return new Subst();
        // }

        if (t1 instanceof TypeVariable) {
            return this.bind(t1, t2);
        }

        if (t2 instanceof TypeVariable) {
            return this.bind(t2, t1);
        }

        if (
            t1 instanceof BagType &&
            t2 instanceof BagType
        ) {
            if (t1.types.length !== t2.types.length) {
                throw new Error(`Type mismatch: ${t1} and ${t2}`);
            }

            let subst = new Subst();
            for (let i = 0; i < t1.types.length; i++) {
                const tt1 = t1.types[i];
                const tt2 = t2.types[i];

                const new_subst = this.unify(tt1, tt2);

                subst = new_subst.compose(subst);
            }

            return subst;
        }

        if (
            t1 instanceof FunctionType &&
            t2 instanceof FunctionType
        ) {
            const bags = this.unify(t1.argTypes, t2.argTypes);
            const rets = this.unify(t1.returnType, t2.returnType);
            return bags.compose(rets);
        }

        if (
            t1 instanceof StructType &&
            t2 instanceof StructType
        ) {
            if (t1.name !== t2.name) {
                throw new Error(`Type mismatch: ${t1.name} and ${t2.name}`);
            }

            return new Subst();
        }

        return new Subst();
    }

    solve() {
        let subst = new Subst();

        for (const constraint of this.constraints) {
            if (constraint instanceof EqConstraint) {
                const new_constraint = constraint.substitute(subst);

                const new_subst = this.unify(
                    new_constraint.lhs,
                    new_constraint.rhs
                );

                subst = new_subst.compose(subst);
            }
        }

        console.log(subst);
    }
}