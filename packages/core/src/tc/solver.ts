import { EEnv } from "../types";
import { BaConstraint, Constraint, EqConstraint, ExpConstraint, FaConstraint, ImpConstraint, MaConstraint } from "./constraint";
import { global_counter } from "./gen";
import { get_global_subst, set_global_subst, Subst } from "./subst";
import { BagType, FunctionType, StructType, Type, TypeVariable } from "./tc_type";
import { TypeScheme } from "./typescheme";

export class TypeSolver {
    public constraints: Array<Constraint> = [];

    collect_eq(lhs: Type, rhs: Type) {
        this.constraints.push(new EqConstraint(lhs, rhs));
    }

    collect_exp(type: Type, scheme: TypeScheme) {
        this.constraints.push(new ExpConstraint(type, scheme));
    }

    collect_fa(type: Type, ret: Type, field: string) {
        this.constraints.push(new FaConstraint(type, ret, field));
    }

    collect_ma(type: Type, ret: Type, field: string) {
        this.constraints.push(new MaConstraint(type, ret, field));
    }

    collect_bag(type: Type, bag: BagType) {
        this.constraints.push(new BaConstraint(type, bag))
    }

    collect_imp(type: Type, env: EEnv): TypeScheme {
        let fiv = TypeScheme.free_types_in_env(env);

        let ret = new TypeVariable(
            `TVAR${global_counter.next().value}`
        );

        this.constraints.push(new ImpConstraint(type, ret, fiv));

        const t = type.freeTypeVars();
        const vars = Array.from(t).filter(t => !fiv.has(t));

        return new TypeScheme(vars, ret);
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

        console.log(`${t1} and ${t2}`);

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
            const bags = this.unify(
                t1.argTypes,
                t2.argTypes
            );

            const rets = this.unify(
                t1.returnType,
                t2.returnType
            );

            return bags.compose(rets);
        }

        if (
            t1 instanceof StructType &&
            t2 instanceof StructType
        ) {
            if (t1.name !== t2.name) {
                throw new Error(`Type mismatch: ${t1.name} and ${t2.name}`);
            }

            let subst = new Subst();

            const bags = this.unify(
                t1.args,
                t2.args
            )

            subst = bags.compose(subst);

            let t1_keys = Array.from(t1.fields.keys());
            let t2_keys = Array.from(t1.fields.keys());

            for (let i = 0; i < t1_keys.length; i++) {
                const k1 = t1_keys[i];
                const k2 = t2_keys[i];

                const v1 = t1.fields.get(k1);
                const v2 = t2.fields.get(k2);

                if (!v1 || !v2) {
                    throw new Error(`Type mismatch: ${t1.name} and ${t2.name}`);
                }

                const t1_types = v1.instantiate()
                const t2_types = v1.instantiate()

                const new_subst = this.unify(t1_types, t2_types);

                subst = new_subst.compose(subst);
            }

            return subst;
        }

        return new Subst();
    }

    solve() {
        let subst = get_global_subst()
        let updated_subst = subst;

        //    console.log(`----------> \n${this.constraints}\n --------->`)

        for (const constraint of this.constraints) {
            if (constraint instanceof EqConstraint) {
                 console.log("+++ eq constraint");
                const new_constraint = constraint.substitute(updated_subst);

                const new_subst = this.unify(
                    new_constraint.lhs,
                    new_constraint.rhs
                );

                updated_subst = new_subst.compose(updated_subst);
            } else if (constraint instanceof ExpConstraint) {
                console.log("+++ exp constraint");
                const instance_type = constraint.instance_type.substitute(updated_subst);
                const scheme_instance = constraint.scheme.instantiate();

                // not sure why we have to substitute twice
                let instance_again = instance_type.substitute(updated_subst);

                const new_subst = this.unify(instance_again, scheme_instance);
                updated_subst = new_subst.compose(updated_subst);
            } else if (constraint instanceof ImpConstraint) {
                console.log("+++ imp constraint");
                // can infer the type of a function without even parametizing
                const new_constraint = constraint.substitute(updated_subst);

                const ftv_env = new_constraint.M;
                const ftv_antecedent = new_constraint.antecedent.freeTypeVars();

                const quantified = [];

                for (const t of ftv_antecedent) {
                    if (!ftv_env.has(t)) {
                        quantified.push(t);
                    }
                }

                const scheme = new TypeScheme(quantified, new_constraint.antecedent);

                // substitute the instance again
                const instance = scheme.instantiate().substitute(updated_subst);

                const new_subst = this.unify(
                    instance,
                    new_constraint.consequent
                );

                updated_subst = new_subst.compose(updated_subst);
            } else if (
                constraint instanceof FaConstraint &&
                !(constraint instanceof MaConstraint)
            ) {
                 console.log("+++ fa constraint");
                const new_constraint = constraint.substitute(updated_subst);

                if (!(new_constraint.obj instanceof StructType)) throw new Error("Field access must be on a struct");

                const field = new_constraint.obj.fields.get(new_constraint.field);

                if (!field) throw new Error(`Field '${new_constraint.field}' doesn't exist on struct '${new_constraint.obj.name}'`);

                const field_instance = field.instantiate();

                const new_subst = this.unify(
                    new_constraint.ret,
                    field_instance
                );

                updated_subst = new_subst.compose(updated_subst);
            } else if (constraint instanceof MaConstraint) {
                 console.log("+++ ma constraint");
                const new_constraint = constraint.substitute(updated_subst);

                if (!(new_constraint.obj instanceof StructType)) throw new Error("Field access must be on a struct");

                const method = new_constraint.obj.methods.get(new_constraint.field);

                if (!method) throw new Error(`Method '${new_constraint.field}' doesn't exist on struct '${new_constraint.obj.name}'`);

                const method_instance = method.instantiate();

                const new_subst = this.unify(
                    new_constraint.ret,
                    method_instance
                );

                updated_subst = new_subst.compose(updated_subst);
            } else if (constraint instanceof BaConstraint) {
                const new_constraint = constraint.substitute(updated_subst);

                let bag_a, bag_b = new_constraint.args;

                if (new_constraint.obj instanceof StructType) {
                    bag_a = new_constraint.obj.args;
                }

                if (!bag_a || !bag_b) throw new Error("Bag type mismatch");

                try {
                    const new_subst = this.unify(
                        bag_a,
                        bag_b
                    )

                    updated_subst = new_subst.compose(updated_subst)
                } catch (e) {
                    // sink errors here bcoz BaConstraint is intended to unify early
                    // in any case, errors will be caught later
                }

            }
        }

        set_global_subst(updated_subst);

        // console.log(subst);
    }
}