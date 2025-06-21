import { EEnv } from "../types";
import { global_counter } from "./gen";
import { Subst } from "./subst";
import { BagType, Type, TypeVariable } from "./tc_type";
import { TypeScheme } from "./typescheme";

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

export class ExpConstraint extends Constraint {
    constructor(
        public instance_type: Type,
        public scheme: TypeScheme
    ) {
        super();
    }

    toString(): string {
        return `${this.instance_type} exp= ${this.scheme}`;
    }

    substitute(subst: Subst): ExpConstraint {
        return new ExpConstraint(
            this.instance_type.substitute(subst),
            this.scheme.substitute(subst)
        );
    }
}

export class ImpConstraint extends Constraint {
    constructor(
        public antecedent: Type,
        public consequent: Type,
        public M: Set<string>
    ) {
        super();
    }

    toString(): string {
        return `${this.antecedent} => ${this.consequent} in ${Array.from(this.M).join(", ")}`
    }

    substitute(subst: Subst): ImpConstraint {
        return new ImpConstraint(
            this.antecedent.substitute(subst),
            this.consequent.substitute(subst),
            this.M
        )
    }
}

// bind two bag types
export class BaConstraint extends Constraint {
    constructor(
        public obj: Type,
        public args: BagType,
    ) {
        super()
    }

    toString(): string {
        return `${this.obj} ${this.args}`
    }

    substitute(subst: Subst): BaConstraint {
        return new BaConstraint(
            this.obj.substitute(subst),
            this.args.substitute(subst)
        )
    }
}

export class FaConstraint extends Constraint {
    constructor(
        public obj: Type,
        public ret: Type,
        public field: string,
    ) {
        super()
    }

    toString(): string {
        return `${this.obj}.${this.field}`
    }

    substitute(subst: Subst): FaConstraint {
        return new FaConstraint(
            this.obj.substitute(subst),
            this.ret.substitute(subst),
            this.field
        )
    }
}


export class MaConstraint extends FaConstraint {
    constructor(
        obj: Type,
        ret: Type,
        field: string,
    ) {
        super(
            obj,
            ret,
            field
        )
    }
}