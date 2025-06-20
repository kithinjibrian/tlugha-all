import { EEnv } from "../types";
import { Subst } from "./subst";
import { Type } from "./tc_type";

export abstract class Constraint {
    abstract toString(): string;
    abstract substitute(subst: Subst): Constraint;
}

export class EqConstraint extends Constraint {
    constructor(public lhs: Type, public rhs: Type) {
        super();
    }

    toString(): string {
        return `${this.lhs} = ${this.rhs}`;
    }

    substitute(subst: Subst): EqConstraint {
        return new EqConstraint(
            this.lhs.substitute(subst),
            this.rhs.substitute(subst)
        );
    }
}