import {
    ArrayType,
    ASTNode,
    ASTVisitor,
    BlockNode,
    ExpressionStatementNode,
    ExtensionStore,
    FunctionDecNode,
    MacroFunctionNode,
    ProgramNode,
    SourceElementsNode,
    StringNode,
    StringType,
    TupleType,
    Type,
    EnumType,
    Registry,
    Module,
    Frame,
    replace_node,
    push_between_node,
    NumberNode,
    TokenType,
    Token,
    Parser,
    NumberType,
    StructNode,
    AttributeNode,
    MetaItemNode,
    FieldNode,
    RegArgs,
    TypeNode
} from "@kithinji/tlugha-core";

import {
    EngineNode,
    lugha_fn,
    pipe_args,
    pipe_expandmacro,
    pipe_procmacro
} from "../types";

import * as path from 'path';

type Ret =
    | {
        tag: "single",
        value: Type<any>
    }
    | {
        tag: "array",
        value: Type<any>[]
    }

export class ExpandMacro implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("expand");

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public lugha: lugha_fn,
        public ast?: ASTNode,
    ) {
    }

    public async before_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        // console.log("expand", node.type)
        for (const ext of this.extension.get_extensions()) {
            await ext.before_accept?.(node, this, args)
        }
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<Ret | undefined> {
        if (node == undefined) return;

        let handledByExtension = false;

        for (const ext of this.extension.get_extensions()) {
            if (ext.handle_node) {
                const result = await ext.handle_node(node, this, args);
                if (result === true) {
                    handledByExtension = true;
                    break;
                }
            }
        }

        if (!handledByExtension) {
            try {
                return await node.accept(this, args);
            } catch (error) {
                throw error;
            }
        }
    }

    public async after_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        for (const ext of this.extension.get_extensions()) {
            await ext.after_accept?.(node, this, args)
        }
    }

    async run() {
        if (this.ast) {
            await this.visit(this.ast, { frame: this.root.frame, module: this.root });
        }

        return this;
    }

    async run_macro(
        tokens: Type<any>[],
        node: ASTNode,
        macro: RegArgs
    ) {
        const a = path.parse(this.file);

        const fun = macro.node as FunctionDecNode;

        const attrs = fun.attributes;

        fun.attributes = undefined;
        fun.frame = macro.frame;
        fun.module = macro.module;

        const engine = await this.lugha({
            pipeline: [
                async (args: pipe_args, next: Function) => {
                    args.file_path = path.join(args.wd, args.file)
                    await next()
                },
                pipe_procmacro,
                pipe_expandmacro,
                async (args: pipe_args, next: Function) => {
                    if (macro.module == null) throw new Error("Macro doesn't have a module");

                    try {
                        const engine = new EngineNode(
                            args.file_path ?? "",
                            args.rd,
                            args.wd,
                            macro.module,
                            this.lugha,
                            args.ast,
                        );

                        await engine.run()

                        args.engine = engine;
                    } catch (e) {
                        throw e;
                    }
                }
            ],
            wd: a.dir,
            rd: a.dir,
            file: a.base,
            ast: fun
        })

        if (!engine) throw new Error("Undefined Engine");

        const result = await engine.call_main(
            fun.identifier.name,
            [new ArrayType(tokens)],
            true
        );

        fun.attributes = attrs;
        fun.frame = null;
        fun.module = null;

        const res_tokens = [];

        for (let t of result) {
            const m: Record<string, Function> = {
                "String": () => TokenType.String,
                "Number": () => TokenType.Number,
                "Identifier": (value: string) => {
                    let t: Record<string, string> = {
                        "let": TokenType.Let,
                        "impl": TokenType.Impl,
                        "fun": TokenType.Fun
                    }

                    return value in t ? t[value] : TokenType.Identifier
                },
                "Op": (value: string) => {
                    let t: Record<string, string> = {
                        "+": TokenType.Plus,
                        "=": TokenType.Equals,
                        ";": TokenType.SemiColon,
                        "(": TokenType.LeftParen,
                        ")": TokenType.RightParen,
                        "{": TokenType.LeftBrace,
                        "}": TokenType.RightBrace,
                        "::": TokenType.Scope,
                        ":": TokenType.Colon,
                        ">=": TokenType.GTE,
                        "<=": TokenType.LTE,
                        ">": TokenType.GT,
                        "<": TokenType.LT,
                        ",": TokenType.Comma,
                        ".": TokenType.Dot,
                    }

                    return t[value];
                }
            };

            const value = t.getValue().getValue().pop();

            const token: Token = {
                type: m[t.tag](value),
                value: String(value),
                line: 0,
                column: 0,
                line_str: ""
            };

            res_tokens.push(token);
        }

        if (res_tokens[res_tokens.length - 1].type !== TokenType.EOF)
            res_tokens.push({
                type: TokenType.EOF,
                value: "",
                line: 0,
                column: 0,
                line_str: ""
            })

        let parser = new Parser(res_tokens, "");
        let ast = parser.parse();

        return ast;
    }

    async visitProgram(node: ProgramNode, args?: Record<string, any>) {
        await this.visit(node.program, args);
    }

    async visitSourceElements(
        node: SourceElementsNode,
        args?: Record<string, any>
    ) {
        for (const src of node.sources) {
            await this.visit(src, args);
        }
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.body, args)
    }

    async visitBlock(
        node: BlockNode,
        args?: Record<string, any>
    ) {
        for (const n of node.body) {
            await this.visit(n, args);
        }
    }

    async visitExpressionStatement(node: ExpressionStatementNode, args?: Record<string, any>) {
        await this.visit(node.expression, args);
    }

    async visitStruct(
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visitStruct_Macro(node, { frame, module });
    }

    async visitStruct_Macro(
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        if (!node.attributes || node.attributes.length === 0) {
            return;
        }

        for (const attr of node.attributes) {
            await this.evaluateAttribute(attr, node, { frame, module });
        }
    }

    async evaluateAttribute(
        attr: AttributeNode,
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const metaItem = attr.meta;
        const name = metaItem.path.name[0];

        switch (name) {
            case "derive":
                await this.derive(metaItem, node, { frame, module })
                break;
        }
    }

    async derive(
        metaItem: MetaItemNode,
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        if (metaItem.meta) {
            for (const arg of metaItem.meta) {
                if (arg.meta && arg.meta.path && arg.meta.path.name.length > 0) {
                    const name = arg.meta.path.name[0];

                    const fun = frame.get(name);

                    if (!(fun instanceof FunctionDecNode)) {
                        throw new Error(`Macro '${name}' couldn't be found`)
                    }

                    const path = fun.hot.get("pma_path");

                    if (path == undefined) {
                        throw new Error(`Macro '${name}' couldn't be found`)
                    }

                    const reg = Registry.get_instance();

                    const macro = reg.get_macro(path);

                    if (macro == undefined) {
                        throw new Error(`Macro '${path}' couldn't be found`)
                    }

                    const tokens: Type<any>[] = [
                        new EnumType("Identifier", new TupleType([new StringType("struct")])),
                        new EnumType("Identifier", new TupleType([new StringType(node.name)])),
                    ];

                    tokens.push(new EnumType("Op", new TupleType([new StringType("{")])))

                    for (let src of node.body) {
                        if (src instanceof FieldNode) {
                            const _t = await this.visit(src, { frame, module })

                            if (_t?.tag == "array")
                                tokens.push(..._t.value);
                        }
                    }

                    tokens.push(new EnumType("Op", new TupleType([new StringType("}")])))

                    let ast = await this.run_macro(tokens, node, macro)

                    push_between_node(node, ast);
                }
            }
        }
    }

    async visitField(
        node: FieldNode,
        args?: Record<string, any>
    ) {
        const tokens = [];
        if (node.mutable) {
            tokens.push(new EnumType("Identifier", new TupleType([new StringType("mut")])))
        }

        tokens.push(new EnumType("Identifier", new TupleType([new StringType(node.field.name)])))
        tokens.push(new EnumType("Op", new TupleType([new StringType(":")])))

        const _t = await this.visit(node.data_type, args)

        if (_t?.tag == "array")
            tokens.push(..._t.value)

        tokens.push(new EnumType("Op", new TupleType([new StringType(";")])))

        return {
            tag: "array",
            value: tokens
        };
    }

    async visitType(node: TypeNode, args?: Record<string, any>) {
        const tokens = [
            new EnumType("Identifier", new TupleType([new StringType(node.name)]))
        ];

        return {
            tag: "array",
            value: tokens
        };
    }

    async visitMacroFunction(
        node: MacroFunctionNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const name = node.name.name[0];
        const reg = Registry.get_instance();
        const module_path = `${module.get_path()}::${name}`;

        const macro = reg.get_macro(module_path);

        if (macro == undefined) {
            throw new Error(`Macro '${module_path}' couldn't be found`)
        }

        const tokens: Type<any>[] = [];

        tokens.push(new EnumType("Op", new TupleType([new StringType("(")])))

        for (let [index, src] of node.args.entries()) {
            const token = await this.visit(src, { frame, module });

            if (token?.tag == "single") {
                tokens.push(token.value)

                if (index < node.args.length - 1) {
                    tokens.push(new EnumType("Op", new TupleType([new StringType(",")])))
                }
            }
        }

        tokens.push(new EnumType("Op", new TupleType([new StringType(")")])))

        let ast = await this.run_macro(tokens, node, macro);

        replace_node(node, ast);
    }

    async visitString(node: StringNode, args?: Record<string, any>) {
        return {
            tag: "single",
            value: new EnumType("String", new TupleType([new StringType(node.value)]))
        };
    }

    async visitNumber(node: NumberNode, args?: Record<string, any>) {
        return {
            tag: "single",
            value: new EnumType("Number", new TupleType([new NumberType(node.value)]))
        };
    }
}