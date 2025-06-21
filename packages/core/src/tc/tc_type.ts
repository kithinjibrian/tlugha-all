import { ASTNode, id, Module } from "../types";
import { Subst } from "./subst";
import { TypeScheme } from "./typescheme";

export abstract class Type {
    public dependenacies: Array<ASTNode> = [];

    add_dependenacy(node: ASTNode) {
        this.dependenacies.push(node);
    }

    abstract toString(): string;
    abstract alias(als: any): void;
    abstract equals(other: Type): boolean;
    abstract substitute(subst: Subst): Type;
    abstract freeTypeVars(): Set<string>;
}

export class TypeVariable extends Type {
    constructor(public name: string) {
        super();
    }

    alias() { }

    toString(): string {
        return this.name;
    }

    equals(other: Type): boolean {
        return other instanceof TypeVariable && this.name === other.name;
    }

    substitute(subst: Subst): Type {
        console.log("type var susbtitute");
        return subst.get(this) || this;
    }

    freeTypeVars(): Set<string> {
        return new Set([this.name]);
    }

    bind_to_ast(type: Type) {
        for (const node of this.dependenacies) {
            if ("data_type" in node)
                node.data_type = type;
        }
    }
}

export class FunctionType extends Type {
    constructor(
        public argTypes: BagType,
        public returnType: Type,
        public kind: "enum_variant" | "function" = "function"
    ) {
        super();
    }

    alias() { }

    toString(): string {
        const arg = this.argTypes.toString();
        const ret = this.returnType.toString();
        return `fun(args: ${arg}, ret: ${ret})`;
    }

    equals(other: Type): boolean {
        return other instanceof FunctionType &&
            this.argTypes.equals(other.argTypes) &&
            this.returnType.equals(other.returnType);
    }

    substitute(subst: Subst): Type {
        console.log("FunctionType susbtitute");
        return new FunctionType(
            this.argTypes.substitute(subst),
            this.returnType.substitute(subst),
            this.kind
        );
    }

    freeTypeVars(): Set<string> {
        const argVars = this.argTypes.freeTypeVars();
        const retVars = this.returnType.freeTypeVars();
        return new Set([...argVars, ...retVars]);
    }
}

export class StructType extends Type {
    public __id: string = id(26)

    constructor(
        public name: string,
        public args: BagType,
        public fields: Map<string, TypeScheme>,
        public methods: Map<string, TypeScheme>,
        public module: Module,
        public kind: "struct" | "enum" = "struct"
    ) {
        super();
    }

    alias(als: any) {
        this.name = als;
    }

    toString(verbose = true): string {

        if (!verbose) {
            const f = this.args.types.map(t => t.toString()).join(", ");

            return `${this.name}`;
        }

        const fieldStrs = Array.from(this.fields.entries())
            .map(([name, type]) => `${name}: ${type}`)
            .join(', ');

        return `${this.name} ${this.args} { ${fieldStrs} }`;
    }

    equals(other: Type): boolean {
        if (!(other instanceof StructType) || this.name !== other.name) {
            return false;
        }
        if (this.fields.size !== other.fields.size) {
            return false;
        }
        // for (const [name, type] of this.fields) {
        //     const otherType = other.fields.get(name);
        //     if (!otherType || !type.equals(otherType)) {
        //         return false;
        //     }
        // }
        // change here
        return false;
    }

    substitute(subst: Subst): Type {
        console.log("StructType susbtitute");

        const newFields = new Map<string, TypeScheme>();
        let newMethods = new Map<string, TypeScheme>();

        for (const [name, type] of this.fields) {
            newFields.set(name, type.substitute(subst));
        }

        for (const [name, type] of this.methods) {
            newMethods.set(name, type.substitute(subst));
        }

        //  newMethods = this.methods;

        return new StructType(
            this.name,
            this.args,
            newFields,
            newMethods,
            this.module,
            this.kind
        );
    }

    freeTypeVars(): Set<string> {
        return new Set();
    }
}

export class BagType extends Type {
    constructor(public types: Type[]) {
        super();
    }

    alias(als: any): void {

    }

    toString(): string {
        return `(${this.types.map(t => t.toString()).join(", ")})`;
    }

    substitute(subst: Subst): BagType {
        console.log("BagType susbtitute");
        const s = this.types.map(t => t.substitute(subst));
        return new BagType(s);
    }

    freeTypeVars(): Set<string> {
        const result = new Set<string>();

        for (const t of this.types) {
            for (const v of t.freeTypeVars()) {
                result.add(v);
            }
        }

        return result;
    }

    equals(other: Type): boolean {
        if (!(other instanceof BagType)) {
            return false;
        }
        if (this.types.length !== other.types.length) {
            return false;
        }
        for (let i = 0; i < this.types.length; i++) {
            if (!this.types[i].equals(other.types[i])) {
                return false;
            }
        }
        return true;
    }
}

export class OFType extends Type {

    constructor(
        public obj: Type,
        public field: TypeScheme
    ) {
        super();
    }

    alias(als: any): void {

    }

    toString(): string {
        return `OF(${this.obj.toString()}, ${this.field.toString()})`;
    }

    equals(other: Type): boolean {
        throw new Error("Equals method not implemented in bag type.");
    }

    freeTypeVars(): Set<string> {
        return new Set();
    }

    substitute(subst: Subst): Type {
        throw new Error("Equals method not implemented in bag type.");
    }
}