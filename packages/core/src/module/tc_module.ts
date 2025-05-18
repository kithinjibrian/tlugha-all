import { TypeFrame } from "./frame";

export class TC_Module {
    public parent: TC_Module | null = null;
    public children: TC_Module[] = [];
    public frame: TypeFrame;

    constructor(
        public name: string,
        parent_frame: TypeFrame | null = null
    ) {
        this.frame = new TypeFrame(parent_frame, `${this.name}_frame`);
    }

    add_submodule(child: TC_Module): void {
        child.parent = this;
        this.children.push(child);
    }
}

export class TC_EnumModule extends TC_Module {
    constructor(
        public name: string,
        frame: TypeFrame | null = null,
    ) {
        super(name, frame)
    }
}

export class TC_StructModule extends TC_Module {
    constructor(
        public name: string,
        frame: TypeFrame | null = null,
    ) {
        super(name, frame)
    }
}