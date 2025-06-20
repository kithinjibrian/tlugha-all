import { ASTNode, Module } from "../types";
import { Subst } from "./subst";

export abstract class Type {
    public dependenacies: Array<ASTNode> = [];

    add_dependenacy(node: ASTNode) {
        this.dependenacies.push(node);
    }

    abstract toString(): string;
    abstract equals(other: Type): boolean;
    abstract substitute(subst: Subst): Type;
}

export class TypeVariable extends Type {
    constructor(public name: string) {
        super();
    }

    toString(): string {
        return this.name;
    }

    equals(other: Type): boolean {
        return other instanceof TypeVariable && this.name === other.name;
    }

    substitute(subst: Subst): Type {
        return subst.get(this) || this;
    }

    bind_to_ast(type: Type) {
        for (const node of this.dependenacies) {
            if ("data_type" in node)
                node.data_type = type;
        }
    }
}

export class FunctionType extends Type {
    constructor(public argTypes: BagType, public returnType: Type) {
        super();
    }

    toString(): string {
        const arg = this.argTypes.toString();
        const ret = this.returnType.toString();
        return `(${arg} -> ${ret})`;
    }

    equals(other: Type): boolean {
        return other instanceof FunctionType &&
            this.argTypes.equals(other.argTypes) &&
            this.returnType.equals(other.returnType);
    }

    substitute(subst: Subst): Type {
        return new FunctionType(
            this.argTypes.substitute(subst),
            this.returnType.substitute(subst)
        );
    }
}

export class StructType extends Type {
    constructor(
        public name: string,
        public fields: Map<string, Type>,
        public module: Module
    ) {
        super();
    }

    toString(): string {
        const fieldStrs = Array.from(this.fields.entries())
            .map(([name, type]) => `${name}: ${type}`)
            .join(', ');
        return `${this.name} { ${fieldStrs} }`;
    }

    equals(other: Type): boolean {
        if (!(other instanceof StructType) || this.name !== other.name) {
            return false;
        }
        if (this.fields.size !== other.fields.size) {
            return false;
        }
        for (const [name, type] of this.fields) {
            const otherType = other.fields.get(name);
            if (!otherType || !type.equals(otherType)) {
                return false;
            }
        }
        return true;
    }

    substitute(subst: Subst): Type {
        const newFields = new Map<string, Type>();
        // for (const [name, type] of this.fields) {
        //     newFields.set(name, type.substitute(subst));
        // }
        return new StructType(this.name, newFields, this.module);
    }
}

export class BagType extends Type {
    constructor(public types: Type[]) {
        super();
    }

    toString(): string {
        return `Bag(${this.types.map(t => t.toString()).join(", ")})`;
    }

    substitute(subst: Subst): BagType {
        const s = this.types.map(t => t.substitute(subst));
        return new BagType(s);
    }

    equals(other: Type): boolean {
        throw new Error("Equals method not implemented in bag type.");
    }
}

export class OFType extends Type {

    constructor(
        public obj: Type,
        public field: Type
    ) {
        super();
    }

    toString(): string {
        return "OF";
    }

    equals(other: Type): boolean {
        throw new Error("Equals method not implemented in bag type.");
    }

    substitute(subst: Subst): Type {
        throw new Error("Equals method not implemented in bag type.");
    }
}