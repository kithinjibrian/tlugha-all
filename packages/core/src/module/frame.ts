export abstract class OGFrame {
    constructor(
        public name: string = "",
        public parent: OGFrame | null = null,
        public symbol_table: Map<string, any> = new Map(),
    ) { }

    define(name: string, value: any) {
        this.symbol_table.set(name, value);
    }

    get(name: string): any {
        if (this.symbol_table.has(name)) {
            return this.symbol_table.get(name);
        }
        if (this.parent) {
            return this.parent.get(name); // Lexical scoping
        }

        return null;
    }

    assign(name: string, value: any) {
        if (this.symbol_table.has(name)) {
            this.symbol_table.set(name, value);
        } else if (this.parent) {
            this.parent.assign(name, value);
        } else {
            throw new Error(`Undefined variable: ${name}`);
        }
    }
}

export class TypeFrame extends OGFrame {
    return_flag: boolean = false;
    return_value: any = [];

    constructor(
        parent: TypeFrame | null = null,
        name: string = ""
    ) {
        super(name, parent);
    }
}

export class BorrowFrame extends OGFrame {
    return_flag: boolean = false;
    return_value: any = [];

    constructor(
        parent: BorrowFrame | null = null,
        name: string = ""
    ) {
        super(name, parent);
    }
}

export class Frame extends OGFrame {
    stack: any[] = [];
    break_flag: boolean = false;
    return_flag: boolean = false;
    continue_flag: boolean = false;
    return_value: any = undefined;

    constructor(
        parent: Frame | null = null,
        name: string = ""
    ) {
        super(name, parent);
    }
}