export class Frame {
    stack: any[] = [];
    break_flag: boolean = false;
    return_flag: boolean = false;
    continue_flag: boolean = false;
    symbol_table: Map<string, any> = new Map();
    return_value: any = undefined;

    constructor(
        public parent: Frame | null = null,
        public name: string = ""
    ) {
    }

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

export class Module {
    public parent: Module | null = null;
    public children: Module[] = [];
    public frame: Frame;

    constructor(
        public name: string,
        parent_frame: Frame | null = null
    ) {
        this.frame = new Frame(parent_frame, `${this.name}_frame`);
    }

    add_submodule(child: Module): void {
        child.parent = this;
        this.children.push(child);
    }
}