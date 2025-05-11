import { Engine, Frame, Module } from "../types";

export interface Env {
    engine: Engine,
    frame: Frame,
    module: Module
}

export interface Operations<T> {
    getType?: () => string;
    getValue?: () => any;
    not?: (env: Env) => Promise<Type<boolean>>;
    add?: (env: Env, obj: Type<T>) => Promise<Type<T>>;
    minus?: (env: Env, obj: Type<T>) => Promise<Type<T>>;
    divide?: (env: Env, obj: Type<T>) => Promise<Type<T>>;
    modulo?: (env: Env, obj: Type<T>) => Promise<Type<T>>;
    multiply?: (env: Env, obj: Type<T>) => Promise<Type<T>>;
    str?: (env: Env, indentLevel?: number) => Promise<string>;
    lt?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    gt?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    lte?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    gte?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    eq?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    neq?: (env: Env, obj: Type<T>) => Promise<Type<boolean>>;
    or?: (env: Env, obj: Type<boolean>) => Promise<Type<boolean>>;
    and?: (env: Env, obj: Type<boolean>) => Promise<Type<boolean>>;
    set?: (env: Env, index: Type<any>, new_value: Type<any>) => Promise<void>;
    get?: (env: Env, obj: Type<any>, args: Type<any>[]) => Promise<any>;
}

export abstract class Type<T> {
    public type: string;
    public value: T;
    protected readonly operations: Operations<T>;
    abstract [Symbol.iterator](): Iterator<any>;

    constructor(type: string, value: T, operations: Operations<T>) {
        this.type = type;
        this.value = value;
        this.operations = operations;
    }

    getType(): string {
        if (this.operations.getType) {
            return this.operations.getType();
        }
        return this.type;
    }

    getValue(): T {
        if (this.operations.getValue) {
            return this.operations.getValue();
        }
        return this.value;
    }

    async str(env: Env, indentLevel?: number): Promise<any> {
        if (this.operations.str) {
            return await this.operations.str(env, indentLevel);
        }

        return JSON.stringify(this.value, null, 2);
    }

    async get(env: Env, obj: Type<any>, args: Type<any>[]): Promise<any> {
        if (this.operations.get) {
            return await this.operations.get(env, obj, args);
        }
        throw new Error(`Operation 'get' not supported for type ${this.type}`);
    }

    async set(env: Env, index: Type<any>, new_value: Type<any>) {
        if (this.operations.set) {
            return await this.operations.set(env, index, new_value);
        }
        throw new Error(`Operation 'set' not supported for type ${this.type}`);
    }

    async add(env: Env, obj: Type<T>): Promise<Type<T>> {
        if (this.operations.add) {
            return await this.operations.add(env, obj);
        }

        throw new Error(`Operation 'add' not supported for type ${this.type}`);
    }

    async minus(env: Env, obj: Type<T>): Promise<Type<T>> {
        if (this.operations.minus) {
            return await this.operations.minus(env, obj);
        }
        throw new Error(`Operation 'minus' not supported for type ${this.type}`);
    }

    async multiply(env: Env, obj: Type<T>): Promise<Type<T>> {
        if (this.operations.multiply) {
            return await this.operations.multiply(env, obj);
        }
        throw new Error(`Operation 'multiply' not supported for type ${this.type}`);
    }

    async divide(env: Env, obj: Type<T>): Promise<Type<T>> {
        if (this.operations.divide) {
            return await this.operations.divide(env, obj);
        }
        throw new Error(`Operation 'divide' not supported for type ${this.type}`);
    }

    async modulo(env: Env, obj: Type<T>): Promise<Type<T>> {
        if (this.operations.modulo) {
            return await this.operations.modulo(env, obj);
        }
        throw new Error(`Operation 'modulo' not supported for type ${this.type}`);
    }

    async lt(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.lt) {
            return await this.operations.lt(env, obj);
        }
        throw new Error(`Operation 'lt' not supported for type ${this.type}`);
    }

    async gt(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.gt) {
            return await this.operations.gt(env, obj);
        }
        throw new Error(`Operation 'gt' not supported for type ${this.type}`);
    }

    async lte(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.lte) {
            return await this.operations.lte(env, obj);
        }
        throw new Error(`Operation 'lt' not supported for type ${this.type}`);
    }

    async gte(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.gte) {
            return await this.operations.gte(env, obj);
        }
        throw new Error(`Operation 'gt' not supported for type ${this.type}`);
    }

    async eq(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.eq) {
            return await this.operations.eq(env, obj);
        }
        throw new Error(`Operation 'eq' not supported for type ${this.type}`);
    }

    async neq(env: Env, obj: Type<T>): Promise<Type<boolean>> {
        if (this.operations.neq) {
            return await this.operations.neq(env, obj);
        }
        throw new Error(`Operation 'neq' not supported for type ${this.type}`);
    }

    async not(env: Env,): Promise<Type<boolean>> {
        if (this.operations.not) {
            return await this.operations.not(env);
        }
        throw new Error(`Operation 'not' not supported for type ${this.type}`);
    }

    async and(env: Env, obj: Type<boolean>): Promise<Type<boolean>> {
        if (this.operations.and) {
            return await this.operations.and(env, obj);
        }
        throw new Error(`Operation 'and' not supported for type ${this.type}`);
    }

    async or(env: Env, obj: Type<boolean>): Promise<Type<boolean>> {
        if (this.operations.or) {
            return await this.operations.or(env, obj);
        }
        throw new Error(`Operation 'or' not supported for type ${this.type}`);
    }
}
