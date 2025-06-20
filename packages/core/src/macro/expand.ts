import {
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
    replace_node,
    push_between_node,
    NumberNode,
    NumberType,
    StructNode,
    AttributeNode,
    MetaItemNode,
    FieldNode,
    RegArgs,
    TypeNode,
    TError,
    ArrayNode,
    PathNode,
    EEnv
} from "../types";

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
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("expand_macro");

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public lugha: Function,
        public ast?: ASTNode,
    ) {
    }

    public error(
        ast: ASTNode | null,
        code: string,
        reason: string,
        hint?: string,
        context?: string,
        expected?: string[],
        example?: string
    ): never {
        let token = {
            line: 1,
            column: 1,
            line_str: ""
        };

        if (ast && ast.token) {
            token = ast.token;
        }

        throw new TError({
            file: this.file,
            code,
            reason,
            line: token.line,
            column: token.column,
            lineStr: token.line_str,
            stage: 'expand_macro',
            hint,
            context,
            expected,
            example
        });
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

    async run(ext_ignore?: boolean) {
        if (ext_ignore == undefined) {
            for (const ext of this.extension.get_extensions()) {
                for (const fn of ext.before_run?.()) {
                    await fn({
                        root: this.root,
                        file: this.file
                    })
                }
            }
        }

        if (this.ast) {
            await this.visit(this.ast, { env: this.root.env, module: this.root });
        }

        return this;
    }

    async run_macro(
        tokens: Type<any>[],
        node: ASTNode,
        macro: RegArgs
    ): Promise<ASTNode> {
        throw new Error("not implemented")
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
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visit(node.body, { env, module });

        env.define(node.identifier.name, node);
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
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visitStruct_Macro(node, { env, module });
    }

    async visitStruct_Macro(
        node: StructNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        if (!node.attributes || node.attributes.length === 0) {
            return;
        }

        for (const attr of node.attributes) {
            await this.evaluateAttribute(attr, node, { env, module });
        }
    }

    async evaluateAttribute(
        attr: AttributeNode,
        node: StructNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const metaItem = attr.meta;
        const name = metaItem.path.name[0];

        switch (name) {
            case "derive":
                await this.derive(metaItem, node, { env, module })
                break;
        }
    }

    async derive(
        metaItem: MetaItemNode,
        node: StructNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        if (metaItem.meta) {
            for (const arg of metaItem.meta) {
                if (arg.meta && arg.meta.path && arg.meta.path.name.length > 0) {
                    const name = arg.meta.path.name[0];

                    const fun = env.get(name);

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
                            const _t = await this.visit(src, { env, module })

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
        { env, module }: { env: EEnv, module: Module }
    ) {
        const name = node.name.name[0];
        const reg = Registry.get_instance();
        const module_path = `${module.get_path()}::${name}`;

        // console.log(env.get(name));

        const macro = reg.get_macro(module_path);

        if (macro == undefined) {
            throw new Error(`Macro '${module_path}' couldn't be found`)
        }

        const tokens: Type<any>[] = [];

        tokens.push(new EnumType("Op", new TupleType([new StringType("[")])))

        for (let [index, src] of node.args.entries()) {
            const token = await this.visit(src, { env, module });
            if (token?.tag == "single") {
                tokens.push(token.value)
            } else if (token?.tag == "array") {
                tokens.push(...token.value)
            }

            if (index < node.args.length - 1) {
                tokens.push(new EnumType("Op", new TupleType([new StringType(",")])))
            }
        }

        tokens.push(new EnumType("Op", new TupleType([new StringType("]")])))

        let ast = await this.run_macro(tokens, node, macro);


        replace_node(node, ast);
    }

    async visitPath(
        node: PathNode,
        args?: Record<string, any>
    ) {
        if (node.name.length == 1) {
            return {
                tag: "single",
                value: new EnumType("Identifier", new TupleType([new StringType(node.name[0])]))
            };
        }

        const tokens = [];

        for (let [index, name] of node.name.entries()) {
            tokens.push(new EnumType("Identifier", new TupleType([new StringType(name)])))

            if (index < node.name.length - 1) {
                tokens.push(new EnumType("Op", new TupleType([new StringType("::")])))
            }
        }

        return {
            tag: "array",
            value: tokens
        }
    }

    async visitArray(node: ArrayNode, args?: Record<string, any>) {
        const tokens = [];

        tokens.push(new EnumType("Op", new TupleType([new StringType("[")])))

        for (let [index, src] of node.elements.entries()) {
            const token = await this.visit(src, args);

            if (token?.tag == "single") {
                tokens.push(token.value)
            }

            if (index < node.elements.length - 1) {
                tokens.push(new EnumType("Op", new TupleType([new StringType(",")])))
            }
        }

        tokens.push(new EnumType("Op", new TupleType([new StringType("]")])))

        return {
            tag: "array",
            value: tokens
        };
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