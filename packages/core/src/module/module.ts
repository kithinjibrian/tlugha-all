import { Frame } from "./frame";

export class Module {
    public parent: Module | null = null;
    public children: Module[] = [];
    public frame: Frame;

    constructor(
        public name: string,
        parent_frame: Frame | null = null,
        public tag: string = ""
    ) {
        this.frame = new Frame(parent_frame, `${this.name}_frame`);
    }

    add_submodule(child: Module): void {
        if (!child.parent)
            child.parent = this;

        this.children.push(child);
    }

    get_path(): string {
        const names: string[] = [];

        let current: Module | null = this;

        while (current !== null) {
            names.unshift(current.name);
            current = current.parent;
        }

        return names.join("::");
    }
}

export class EnumModule extends Module {
    constructor(
        public name: string,
        frame: Frame | null = null,
    ) {
        super(name, frame)
    }
}

export class StructModule extends Module {
    constructor(
        public name: string,
        frame: Frame | null = null,
    ) {
        super(name, frame)
    }
}