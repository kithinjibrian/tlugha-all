import { ASTNode, TError, TypeFrame } from "../types";
import { tvar, Types } from "./type";

declare global {
    interface Set<T> {
        addType(value: Types): Set<Types>;
        hasType(value: Types): boolean;
    }
    interface Map<K, V> {
        getType(key: Types): Types | undefined;
        setType(key: Types, value: Types): Map<Types, Types>;
    }
}

Set.prototype.hasType = function (value: Types) {
    if (value.tag === "TVar") {
        return [...this].some(item =>
            item.tag === "TVar" && item.tvar === value.tvar
        );
    }
    return this.has(value);
};

Map.prototype.setType = function (key: Types, value: Types) {
    if (key.tag === "TVar") {
        return this.set(key.tvar, value);
    }
    return this.set(key, value);
};

Map.prototype.getType = function (key: Types) {
    if (key.tag === "TVar") {
        return this.get(key.tvar);
    }
    return this.get(key);
};

export type Constraint =
    | {
        tag: "EQUALITY_CON";
        left: Types;
        right: Types;
        ast: ASTNode | null;
        str: () => string;
    }
    | {
        tag: "EXPLICIT_CON";
        instance_type: Types;
        scheme: Scheme;
        ast: ASTNode;
    }
    | {
        tag: "IMPLICIT_CON";
        antecedent: Types;
        consequent: Types;
        M: Set<Types>;
    };

export type Scheme = { vars: Types[]; type: Types };

export type Ret =
    | {
        type: "type";
        value: Types;
    }
    | {
        type: "scheme";
        value: Scheme;
    };

export class HM {
    public errors: string[] = [];

    constructor(
        public file: string = "",
        public constraints: Constraint[] = []
    ) { }

    public error(
        ast: ASTNode | null,
        code: string,
        reason: string,
        hint?: string,
        context?: string,
        expected?: string[],
        example?: string
    ): void {
        let token = {
            line: 1,
            column: 1,
            line_str: ""
        };

        if (ast && ast.token) {
            token = ast.token;
        }

        const pointer = ' '.repeat(token.column - 1) + '^';

        const message =
            `${this.file ? `File: ${this.file}` : ''}
[Typechecker:${code}] ${reason}
--> line ${token.line}, column ${token.column}
${token.line_str}
${pointer}
${expected ? `Expected: ${expected.join(', ')}` : ''}
${hint ? `Hint: ${hint}` : ''}
${context ? `Context: ${context}` : ''}
${example ? `Example: ${example}` : ''}`;

        this.errors.push(message);
    }

    constraint_eq(left: Types, right: Types, ast: ASTNode | null): void {
        this.constraints.push({
            tag: "EQUALITY_CON",
            left,
            right,
            ast,
            str: () => {
                return `'${this.typeToString(left)}' : '${this.typeToString(right)}'`;
            }
        });
    }

    constraint_exp(instanceType: Types, scheme: Scheme, ast: ASTNode): void {
        this.constraints.push({
            tag: "EXPLICIT_CON",
            instance_type: instanceType,
            scheme,
            ast
        });
    }

    constraint_imp(type: Types, frame: TypeFrame): Scheme {
        const ftvEnv = this.freeTypeVarsInEnv(frame.symbol_table);
        const freshRet = tvar(null);

        this.constraints.push({
            tag: "IMPLICIT_CON",
            antecedent: type,
            consequent: freshRet,
            M: ftvEnv
        });

        const allVars = [...this.tvs(type)];
        const uniqueVars = allVars.filter(t => !ftvEnv.hasType(t));

        return {
            vars: uniqueVars,
            type: freshRet
        };
    }

    typeToString(type: Types | null): string {
        if (type === null) return "unknown";

        switch (type.tag) {
            case "TVar": {
                return type.tvar || "α";
            }
            case "TCon": {
                const name = type.tcon.name;
                if (name === "->") {
                    const types = type.tcon.types;
                    if (types.length === 0) {
                        return "() -> ()";
                    }

                    const [ret, ...args] = [...types].reverse();
                    return `(${args.reverse().map(i => this.typeToString(i)).join(", ")}) -> ${this.typeToString(ret)}`;
                }

                if (type.tcon.types.length === 0) {
                    return name;
                }

                return `${name}<${type.tcon.types.map(t => this.typeToString(t)).join(", ")}>`;
            }
            case "TRec": {
                const fields = Object.entries(type.trec.types)
                    .map(([key, value]) => `${key}: ${this.typeToString(value)}`)
                    .join(", ");
                return `{ ${fields} }`;
            }
            case "TSum": {
                return ""
            }
        }
    }

    typeEquals(a: Types, b: Types): boolean {
        if (a.tag !== b.tag) return false;
        if (a.tag === "TVar" && b.tag === "TVar") return a.tvar === b.tvar;
        if (a.tag === "TCon" && b.tag === "TCon") {
            if (a.tcon.name !== b.tcon.name) return false;
            if (a.tcon.types.length !== b.tcon.types.length) return false;
            return a.tcon.types.every((t, i) => this.typeEquals(t, b.tcon.types[i]));
        }
        if (a.tag === "TRec" && b.tag === "TRec") {
            const aKeys = Object.keys(a.trec.types);
            const bKeys = Object.keys(b.trec.types);
            if (aKeys.length !== bKeys.length) return false;
            if (!aKeys.every(k => b.trec.types.hasOwnProperty(k))) return false;
            return aKeys.every(k => this.typeEquals(a.trec.types[k], b.trec.types[k]));
        }
        return false;
    }

    freeTypeVarsInEnv(env: Map<string, Ret>): Set<Types> {
        const result = new Set<Types>();
        for (const entry of env.values()) {
            if (entry.type === "type") {
                for (const tv of this.tvs(entry.value)) {
                    result.add(tv);
                }
            } else if (entry.type === "scheme") {
                const { vars, type } = entry.value;
                for (const tv of this.tvs(type)) {

                    if (!vars.some(v => this.typeEquals(v, tv))) {
                        result.add(tv);
                    }
                }
            }
        }
        return result;
    }

    generalize(type: Types, frame: TypeFrame): Scheme {
        const ftvType = [...this.tvs(type)];
        const ftvEnv = this.freeTypeVarsInEnv(frame.symbol_table);

        const vars = ftvType.filter(t => !ftvEnv.has(t));

        return { vars, type };
    }

    instantiate(scheme: Scheme, params?: Types[]): Types {
        const subst = new Map<Types, Types>();
        const vars = scheme.vars;

        for (let i = 0; i < vars.length; i++) {
            const v = vars[i];

            const originalName = v.tag === "TVar" ? v.tvar : undefined;
            const tv = tvar(null, originalName);

            if (params && i < params.length && params[i] !== undefined) {

                subst.setType(v, params[i]);

                this.constraint_eq(tv, params[i], v.ast);
            } else {
                const originalName = v.tag === "TVar" ? v.tvar : undefined;

                subst.setType(v, tv);
            }
        }

        const result = this.apply(subst, scheme.type);
        if (result === null) {
            throw new Error(`Failed to instantiate scheme: ${this.typeToString(scheme.type)}`);
        }
        return result;
    }

    tvs(type: Types): Set<Types> {
        const result = new Set<Types>();

        const addAll = (s: Set<Types>) => {
            for (const t of s) {
                result.add(t);
            }
        };

        switch (type.tag) {
            case "TVar":
                result.add(type);
                break;

            case "TCon":
                for (const t of type.tcon.types) {
                    addAll(this.tvs(t));
                }
                break;

            case "TRec":
                for (const t of Object.values(type.trec.types)) {
                    addAll(this.tvs(t));
                }
                break;

            case "TSum":
                for (const t of Object.values(type.tsum.variants)) {
                    addAll(this.tvs(t));
                }
                break;
        }

        return result;
    }

    bind(a: Types, b: Types, ast: ASTNode | null): Map<Types, Types> | null {
        if (a.tag === "TVar") {
            if (b.tag === "TVar" && b.tvar === a.tvar) return new Map();

            if (this.tvs(b).hasType(a)) {
                if (ast) {
                    this.error(
                        ast,
                        'INFINITE_TYPE',
                        `Occurs check fails: ${this.typeToString(a)} in ${this.typeToString(b)}`,
                        'Type cannot contain itself recursively',
                        'This often happens with self-recursive functions that need explicit type annotations'
                    );
                } else {
                    this.error(
                        null,
                        'INFINITE_TYPE',
                        `Occurs check fails: ${this.typeToString(a)} in ${this.typeToString(b)}`
                    );
                }
                return null;
            }

            return new Map().setType(a, b);
        }

        return null;
    }

    apply(subst: Map<Types, Types>, type: Types): Types | null {
        if (type === null) return null;

        switch (type.tag) {
            case "TVar": {
                const substituted = subst.getType(type);
                return substituted !== undefined ? substituted : type;
            }
            case "TCon": {
                const applied = type.tcon.types.map(t => this.apply(subst, t));
                if (applied.some(t => t === null)) return null;

                return {
                    tag: "TCon",
                    tcon: {
                        name: type.tcon.name,
                        types: applied as Types[],
                    },
                    ast: type.ast,
                };
            }
            case "TRec": {
                const appliedTypes: Record<string, Types> = {};
                let hasNull = false;

                for (const [key, value] of Object.entries(type.trec.types)) {
                    const applied = this.apply(subst, value);
                    if (applied === null) {
                        hasNull = true;
                        break;
                    }
                    appliedTypes[key] = applied;
                }

                if (hasNull) return null;

                return {
                    tag: "TRec",
                    trec: {
                        name: type.trec.name,
                        types: appliedTypes
                    },
                    ast: type.ast
                };
            }
            default:
                return null;
        }
    }

    compose(s1: Map<Types, Types>, s2: Map<Types, Types>): Map<Types, Types> {
        const result = new Map<Types, Types>();
        for (const [key, value] of s2.entries()) {
            const applied = this.apply(s1, value);
            if (applied !== null) {
                if (typeof key === 'string') {
                    result.set(key, applied);
                } else {
                    result.set(key, applied);
                }
            }
        }

        for (const [key, value] of s1.entries()) {
            if (!result.has(key)) {
                result.set(key, value);
            }
        }

        return result;
    }

    unify(a: Types | null, b: Types | null, ast: ASTNode | null): Map<Types, Types> | null {
        if (a === null || b === null) return new Map();

        if (a === b) return new Map();

        if (a.tag === "TVar") {
            return this.bind(a, b, ast);
        }

        if (b.tag === "TVar") {
            return this.bind(b, a, ast);
        }

        if (a.tag === "TCon" && b.tag === "TCon") {
            if (a.tcon.name !== b.tcon.name || a.tcon.types.length !== b.tcon.types.length) {
                this.error(
                    ast,
                    'TYPE_MISMATCH',
                    `Types mismatch: Can't unify '${this.typeToString(a)}' with '${this.typeToString(b)}'`,
                    'These types have different constructors or arities'
                );
                return null;
            }

            let subst = new Map<Types, Types>();
            for (let i = 0; i < a.tcon.types.length; i++) {
                const aType = this.apply(subst, a.tcon.types[i]);
                const bType = this.apply(subst, b.tcon.types[i]);
                const newSubst = this.unify(aType, bType, ast);

                if (newSubst === null) return null;
                subst = this.compose(subst, newSubst);
            }
            return subst;
        }

        if (a.tag === "TRec" && b.tag === "TRec") {
            const aKeys = Object.keys(a.trec.types).sort();
            const bKeys = Object.keys(b.trec.types).sort();

            if (aKeys.length !== bKeys.length || !aKeys.every((k, i) => k === bKeys[i])) {
                this.error(
                    ast,
                    'RECORD_MISMATCH',
                    `Record types mismatch: Can't unify '${this.typeToString(a)}' with '${this.typeToString(b)}'`,
                    'Records have different field names'
                );
                return null;
            }

            let subst = new Map<Types, Types>();
            for (const key of aKeys) {
                const aType = this.apply(subst, a.trec.types[key]);
                const bType = this.apply(subst, b.trec.types[key]);
                const newSubst = this.unify(aType, bType, ast);

                if (newSubst === null) return null;
                subst = this.compose(subst, newSubst);
            }
            return subst;
        }

        this.error(
            ast,
            'TYPE_MISMATCH',
            `Types mismatch: Can't unify '${this.typeToString(a)}' with '${this.typeToString(b)}'`,
            'These types have incompatible structures'
        );
        return null;
    }

    solve(): Map<Types, Types> | null {
        let subst = new Map<Types, Types>();

        for (const constraint of this.constraints) {
            let newSubst: Map<Types, Types> | null = null;

            if (constraint.tag === "EQUALITY_CON") {
                const left = this.apply(subst, constraint.left);
                const right = this.apply(subst, constraint.right);
                newSubst = this.unify(left, right, constraint.ast);
            } else if (constraint.tag === "EXPLICIT_CON") {
                const instanceType = this.apply(subst, constraint.instance_type);
                const schemeInstance = this.instantiate(constraint.scheme);
                newSubst = this.unify(instanceType, schemeInstance, constraint.ast);
            } else if (constraint.tag === "IMPLICIT_CON") {
                const antecedent = this.apply(subst, constraint.antecedent);
                const consequent = this.apply(subst, constraint.consequent);

                if (antecedent === null) {
                    this.error(
                        null,
                        'INTERNAL_ERROR',
                        'Null type encountered during implicit constraint solving'
                    );
                    return null;
                }

                const ftv_antecedent = [...this.tvs(antecedent)];
                const ftv_env = constraint.M;

                const quantified: Types[] = ftv_antecedent.filter(
                    t => ![...ftv_env].some(e => e.tag === "TVar" && t.tag === "TVar" && e.tvar === t.tvar)
                );

                const scheme = { vars: quantified, type: antecedent };
                const instance = this.instantiate(scheme);

                newSubst = this.unify(instance, consequent, null);
            }

            if (newSubst === null) {
                break;
            }

            subst = this.compose(subst, newSubst);
        }

        if (this.errors.length > 0) {
            throw new Error(`Types errors found:\n${this.errors.join('\n')}`);
        }

        return subst;
    }
}