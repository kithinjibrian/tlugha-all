export interface Operations<T> {
    getType?: () => string;
    getValue?: () => any;
    inc?: () => Type<T>;
    dec?: () => Type<T>;
    add?: (obj: Type<T>) => Type<T>;
    minus?: (obj: Type<T>) => Type<T>;
    divide?: (obj: Type<T>) => Type<T>;
    modulo?: (obj: Type<T>) => Type<T>;
    multiply?: (obj: Type<T>) => Type<T>;
    str?: (indentLevel?: number) => string;
    lt?: (obj: Type<T>) => Type<boolean>;
    gt?: (obj: Type<T>) => Type<boolean>;
    eq?: (obj: Type<T>) => Type<boolean>;
    neq?: (obj: Type<T>) => Type<boolean>;
    get?: (obj: Type<any>, args: Type<any>[]) => any;
    set?: (index: Type<any>, new_value: Type<any>) => void;
}

export abstract class Type<T> {
    public type: string;
    protected value: T;
    protected readonly operations: Operations<T>;

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

    str(indentLevel?: number): string {
        if (this.operations.str) {
            return this.operations.str(indentLevel);
        }

        return JSON.stringify(this.value, null, 2);
    }

    get(obj: Type<any>, args: Type<any>[]): any {
        if (this.operations.get) {
            return this.operations.get(obj, args);
        }
        throw new Error(`Operation 'get' not supported for type ${this.type}`);
    }

    set(index: Type<any>, new_value: Type<any>) {
        if (this.operations.set) {
            return this.operations.set(index, new_value);
        }
        throw new Error(`Operation 'set' not supported for type ${this.type}`);
    }

    add(obj: Type<T>): Type<T> {
        if (this.operations.add) {
            return this.operations.add(obj);
        }
        throw new Error(`Operation 'add' not supported for type ${this.type}`);
    }

    minus(obj: Type<T>): Type<T> {
        if (this.operations.minus) {
            return this.operations.minus(obj);
        }
        throw new Error(`Operation 'minus' not supported for type ${this.type}`);
    }

    multiply(obj: Type<T>): Type<T> {
        if (this.operations.multiply) {
            return this.operations.multiply(obj);
        }
        throw new Error(`Operation 'multiply' not supported for type ${this.type}`);
    }

    divide(obj: Type<T>): Type<T> {
        if (this.operations.divide) {
            return this.operations.divide(obj);
        }
        throw new Error(`Operation 'divide' not supported for type ${this.type}`);
    }

    modulo(obj: Type<T>): Type<T> {
        if (this.operations.modulo) {
            return this.operations.modulo(obj);
        }
        throw new Error(`Operation 'modulo' not supported for type ${this.type}`);
    }

    lt(obj: Type<T>): Type<boolean> {
        if (this.operations.lt) {
            return this.operations.lt(obj);
        }
        throw new Error(`Operation 'lt' not supported for type ${this.type}`);
    }

    gt(obj: Type<T>): Type<boolean> {
        if (this.operations.gt) {
            return this.operations.gt(obj);
        }
        throw new Error(`Operation 'gt' not supported for type ${this.type}`);
    }

    eq(obj: Type<T>): Type<boolean> {
        if (this.operations.eq) {
            return this.operations.eq(obj);
        }
        throw new Error(`Operation 'eq' not supported for type ${this.type}`);
    }

    neq(obj: Type<T>): Type<boolean> {
        if (this.operations.neq) {
            return this.operations.neq(obj);
        }
        throw new Error(`Operation 'neq' not supported for type ${this.type}`);
    }

    inc(): Type<T> {
        if (this.operations.inc) {
            return this.operations.inc();
        }
        throw new Error(`Operation 'inc' not supported for type ${this.type}`);
    }

    dec(): Type<T> {
        if (this.operations.dec) {
            return this.operations.dec();
        }
        throw new Error(`Operation 'dec' not supported for type ${this.type}`);
    }

}
