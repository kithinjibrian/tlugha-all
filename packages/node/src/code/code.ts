import {
    ASTNode,
    CodeGen,
    Module
} from "@kithinji/tlugha-core";

export class CodeGenNode extends CodeGen {
    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public ast?: ASTNode,
    ) {
        super(
            file,
            rd,
            wd,
            root,
            ast
        )
    }
}