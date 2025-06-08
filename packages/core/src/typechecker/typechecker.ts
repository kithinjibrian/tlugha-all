import {
    ASTNode,
    ASTVisitor,
    BlockNode,
    BooleanNode,
    ExpressionStatementNode,
    ExtensionStore,
    FunctionDecNode,
    IfElseNode,
    NumberNode,
    ProgramNode,
    ReturnNode,
    SourceElementsNode,
    StringNode,
    TError,
    TypeFrame,
    VariableNode,
    VariableStatementNode,
    TC_Module,
    TypeNode,
    ParametersListNode,
    ParameterNode,
    BinaryOpNode,
    ScopedIdentifierNode,
    ErrorCodes,
    CallExpressionNode,
    TypeParameterNode,
    LambdaNode,
    StructNode,
    TC_StructModule,
    FieldNode,
    Module,
    UseNode,
    MemberExpressionNode,
    IdentifierNode,
    SpreadElementNode,
    EnumNode,
    TC_EnumModule,
    EnumVariantNode,
    TupleVariantNode
} from "../types";
import { HM, Ret } from "./hm";
import { ArrayTypes, NumberTypes, StringTypes, tcon, tcon_ex, tfun, TupleTypes, tvar, Types } from "./type";

export class TypeChecker implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("typechecker");
    public hm: HM;
    public primitives: Record<any, any> = {
        "num": NumberTypes.get_instance(),
        "bool": {},
        "str": StringTypes.get_instance(),
        "date": {},
        "unit": {},
        "Self": {},
    }

    public subst: Map<any, any> = new Map();

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public lugha: Function,
        public ast?: ASTNode
    ) {
        this.hm = new HM(this.file);
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
            stage: 'typechecker',
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
        //  console.log(node.type)
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

    exit() {
        try {
            this.hm.solve();
        } catch (e: any) {
            throw e
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
            await this.visit(this.ast, { frame: this.root.frame, module: this.root });

            this.exit();
        }

        return this;
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

    async visitExpressionStatement(
        node: ExpressionStatementNode,
        { frame, module }: { frame: TypeFrame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });

        return {
            type: "type",
            value: tcon("unit", node)
        };
    }

    async visitUse(
        node: UseNode,
        { frame, module }: { frame: TypeFrame, module: Module }
    ) {
        const self = this;
        function resolveModule(path: string[]): Module | undefined {
            let mod, start = 1;
            if (path[0] == "super") {
                if (module.parent) {
                    start = 2;
                    mod = module.parent.children.find(m => m.name === path[1]);
                }
            } else
                mod = self.root.children.find(m => m.name === path[0]);

            if (!mod) {
                self.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Module '${path[0]}' is not defined.`,
                    "Tried to access a module that doesn't exist in the root scope.",
                    `No top-level module named '${path[0]}' was found.`,
                    ["defined module"]
                );

                throw new Error("");
            }

            for (let i = start; i < path.length; i++) {

                mod = mod.children.find(m => m.name === path[i]);
                if (!mod) {
                    self.error(
                        node,
                        ErrorCodes.runtime.UNDEFINED_MODULE,
                        `Module path '${path.slice(0, i + 1).join("::")}' is not defined.`,
                        "Nested module does not exist in the specified path.",
                        `Failed at '${path[i]}' in path '${path.join("::")}'.`,
                        ["existing module path"]
                    );

                    throw new Error("");
                }
            }
            return mod;
        }

        if (node.list) {
            const mod = resolveModule(node.path.path);
            if (!mod) return;

            node.list.items.forEach(item => {
                const symbol = mod.frame.get(item.name);

                if (
                    !symbol ||
                    symbol instanceof StructNode
                ) {
                    mod.children.forEach(m => {
                        if (m.name == item.name) {
                            module.add_submodule(m)
                        }
                    })

                    return;
                }

                frame.define(item.alias ?? item.name, symbol);
            });
        } else {
            const path = node.path.path;
            const mod = resolveModule(path.slice(0, -1));
            if (!mod) return;

            const symbol = mod.frame.get(path[path.length - 1]);

            if (!symbol) {
                mod.children.forEach(m => {
                    if (m.name == path[path.length - 1]) {
                        module.add_submodule(m)
                    }
                })

                return;
            }

            frame.define(node.alias ?? path[path.length - 1], symbol);
        }
    }

    async visitLambda(
        node: LambdaNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const new_frame = new TypeFrame(frame);

        if (node.type_parameters) {
            for (let src of node.type_parameters) {
                await this.visit(src, { frame: new_frame, module })
            }
        }

        let types: Types = tcon_ex("Array", [], node);
        if (node.params) {
            const a = await this.visit(node.params, { frame: new_frame, module });

            if (a?.type == "type")
                types = a.value;
        }

        const body = await this.visit(node.body, { frame: new_frame, module });

        if (body)
            new_frame.return_value.push(body);

        let rt = await this.visit(node.return_type, { frame: new_frame, module });

        let return_type = tvar(node);

        if (rt?.type == "type") {
            return_type = rt.value;

            for (const ret_type of (new_frame.return_value as Types[])) {
                this.hm.constraint_exp(ret_type, {
                    vars: [],
                    type: return_type
                }, node);
            }
        } else {
            for (const ret_type of (new_frame.return_value as Types[])) {
                this.hm.constraint_eq(return_type, ret_type, node);
            }
        }

        return {
            type: "type",
            value: tfun(types, return_type, node)
        };
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const new_frame = new TypeFrame(frame, node.identifier.name);

        if (node.type_parameters) {
            for (let src of node.type_parameters) {
                await this.visit(src, { frame: new_frame, module });
            }
        }

        let types: Types = tcon_ex("Array", [], node);
        if (node.params) {
            const a = await this.visit(node.params, { frame: new_frame, module });
            if (a?.type == "type")
                types = a.value;
        }

        let rt = await this.visit(node.return_type, { frame: new_frame, module });
        let return_type = tvar(node);

        if (rt?.type == "type")
            return_type = rt.value;

        const fun = tfun(types, return_type, node);

        const body = await this.visit(node.body, { frame: new_frame, module });
        if (body)
            new_frame.return_value.push(body);

        if (rt?.type == "type") {
            for (const ret_type of (new_frame.return_value as Types[])) {
                this.hm.constraint_exp(ret_type, {
                    vars: [],
                    type: return_type
                }, node);
            }
        } else {
            for (const ret_type of (new_frame.return_value as Types[])) {
                this.hm.constraint_eq(return_type, ret_type, node);
            }
        }

        const scheme = {
            type: "scheme",
            value: this.hm.generalize(fun, frame)
        };

        frame.define(node.identifier.name, scheme);

        return scheme;
    }

    async visitParametersList(
        node: ParametersListNode,
        args?: Record<string, any>
    ) {
        const params: Types[] = [];

        for (const n of node.parameters) {
            const t = await this.visit(n, args);
            if (t?.type == "type")
                params.push(t.value);
        }

        return {
            type: "type",
            value: tcon_ex("Array", params, node)
        };
    }

    async visitParameter(
        node: ParameterNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        if (node.data_type) {
            const t = await this.visit(node.data_type, { frame, module });
            if (t) {
                frame.define(node.identifier.name, t);

                return t;
            }
        }

        const param_type = {
            type: "type",
            value: node.variadic ? tcon_ex("()", [tvar(node)], node) : tvar(node)
        }

        frame.define(node.identifier.name, param_type);

        return param_type;
    }

    async visitBlock(
        node: BlockNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const new_frame = new TypeFrame(frame, node.name);
        let lastExprType: any = undefined;

        for (let i = 0; i < node.body.length; i++) {
            const stmt = node.body[i];

            const stmt_type = await this.visit(stmt, {
                frame: new_frame,
                module,
                expression: i == (node.body.length - 1)
            });

            if (stmt_type !== undefined) {
                lastExprType = stmt_type;
            }
        }

        frame.return_value = [
            ...(frame.return_value || []),
            ...(new_frame.return_value || [tcon("unit", node)])
        ];

        if (lastExprType)
            return {
                type: "type",
                value: lastExprType
            };
    }


    async visitCallExpression(
        node: CallExpressionNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const callee = await this.visit(node.callee, { frame, module });

        if (!callee || callee.type !== "scheme") {
            const calleeStr = node.callee instanceof ScopedIdentifierNode ? node.callee.name.join("::") : "<unknown>";
            this.error(
                node,
                'UNDEFINED_FUNCTION',
                `Function '${calleeStr}' is not defined or not callable.`
            );
        }

        // Instantiate polymorphic function type (Scheme → fresh type vars)

        // Handle explicit type parameters, if any
        const type_params: Types[] = [];

        if (node.type_params) {
            for (const paramNode of node.type_params) {
                const result = await this.visit(paramNode, {
                    frame,
                    expression: true,
                    module,
                });

                if (!result || result.type !== "type") {
                    this.error(paramNode, "INVALID_ARGUMENT_TYPE", "Expected a value expression.");
                }

                type_params.push(result.value)
            }
        }

        const instantiated = this.hm.instantiate(callee.value, type_params);

        // Visit argument expressions and collect their types
        const args: Types[] = [];

        for (let argNode of node.args) {
            const result = await this.visit(argNode, {
                frame,
                expression: true,
                module,
            });

            if (result) {
                if (result.type == "type") {
                    args.push(result.value);
                } else if (result.type == "scheme") {
                    args.push(this.hm.instantiate(result.value))
                }
            }
        }

        // Create return type variable and expected function type: (args) => ret
        const ret = tvar(node);
        const expected = tfun(tcon_ex("Array", args, node), ret, node);

        // Unify the instantiated function type with the expected type
        this.hm.constraint_eq(expected, instantiated, node.callee);

        return {
            type: "type",
            value: ret
        };
    }

    async get_object(
        node: MemberExpressionNode,
        { frame, module }: { frame: TypeFrame, module: Module }
    ) {
        const object = await this.visit(node.object, { frame, module });

        let propertyValue;
        if (node.computed) {
            // propertyValue = await this.visit(node.property, { frame, module });
        } else {
            propertyValue = (node.property as IdentifierNode).name;
        }

        return {
            object,
            property: propertyValue
        }
    }

    async visitMemberExpression(
        node: MemberExpressionNode,
        { frame, expression, module }: { frame: TypeFrame, expression?: boolean, module: Module }
    ) {
        const { object, property } = await this.get_object(node, { frame, module });

        if (object?.type == "type" && property) {
            const value = await object.value?.methods?.get(property);
            return {
                type: "scheme",
                value: this.hm.generalize(value, frame)
            };
        }
    }

    async visitSpreadElement(
        node: SpreadElementNode,
        { frame, expression, module }: { frame: TypeFrame, expression?: boolean, module: Module }
    ) {
        const type = await this.visit(node.expression, { frame, expression, module });

        if (type?.type == "type") {
            return {
                type: "type",
                value: tcon_ex("()", [type.value], node)
            }
        }
    }

    async visitIfElse(
        node: IfElseNode,
        { frame, expression, module }: { frame: TypeFrame, expression?: boolean, module: Module }
    ): Promise<Ret | undefined> {
        const cond = await this.visit(node.condition, { frame, module });

        if (cond?.type == "type")
            this.hm.constraint_eq(cond.value, tcon("bool", node.condition), node.condition)

        const consequent = await this.visit(node.consequent, { frame, module });

        if (consequent?.type == "type") {
            const _con = consequent.value;

            if (node.alternate) {
                const alternate = await this.visit(node.alternate, { frame, module });

                if (alternate?.type == "type") {
                    const _alt = alternate.value
                    if (alternate && expression !== undefined) {
                        this.hm.constraint_eq(_con, _alt, node);
                    }
                }
            }

            if (expression !== undefined)
                return consequent;
        }
    }

    async visitReturn(
        node: ReturnNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const expr_type = node.expression
            ? await this.visit(node.expression, { frame, expression: true, module })
            : {
                type: "type",
                value: tcon("unit", node)
            };

        frame.return_value.push(expr_type);
    }

    async visitVariableList(
        node: VariableStatementNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.variables, args);

        return {
            type: "type",
            value: tcon("unit", node)
        };
    }

    async visitVariable(
        node: VariableNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        let def_type: Ret | undefined = undefined;

        if (node.data_type) {
            def_type = await this.visit(node.data_type, { frame, module });
        }

        if (node.expression) {
            const infer = await this.visit(node.expression, { frame, module });

            if (infer?.type == "type") {
                node.data_type = infer.value;

                const scheme = this.hm.constraint_imp(infer.value, frame);
                frame.define(node.identifier.name, {
                    type: "scheme",
                    value: scheme
                });

                if (def_type?.type == "type") {
                    this.hm.constraint_exp(infer.value, {
                        vars: [],
                        type: def_type.value
                    }, node);
                }
            }
            return infer;
        } else if (def_type?.type == "type") {
            const varType = tvar(node);

            this.hm.constraint_exp(varType, {
                vars: [],
                type: def_type.value
            }, node);

            frame.define(node.identifier.name, {
                type: "scheme",
                value: { vars: [], type: varType }
            });

            return {
                type: "type",
                value: varType
            };
        }
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const left = await this.visit(node.left, { frame, module });
        const right = await this.visit(node.right, { frame, module });

        if (
            left == undefined ||
            right == undefined
        ) {
            throw new Error("Invalid operands");
        }

        if (left.type != "type" || right.type != "type") {
            throw new Error("operands not types")
        }

        switch (node.operator) {
            case "+":
            case "-":
            case "*":
            case "/": {
                this.hm.constraint_eq(left.value, right.value, node);
                return left;
            }
        }

        throw new Error(`Unsupported operator: ${node.operator}`);
    }

    getScopedSymbol(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: TypeFrame; module: TC_Module }
    ): Ret {
        const __p = (search_frame: TypeFrame, name: string) => {
            const symbol = search_frame.get(name);

            if (!symbol) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_SYMBOL,
                    `Symbol '${name}' is not defined.`,
                    "You may have a typo or used a symbol before declaring it.",
                    `Symbol '${name}' was not found in the current scope.`,
                    ["defined variable or function"],
                    `Valid: let ${name} = 42; let a = ${name} + 10; invalid: let sum = w + 10; Symbol 'w' is not defined.`
                );
            }

            return symbol;
        };

        let current: TC_Module | undefined;

        if (node.name.length === 1) {
            return __p(frame, node.name[0]);
        }

        const rootToken = node.name[0];
        if (rootToken === "root") {
            current = this.root;
        } else if (rootToken === "self") {
            current = module;
        } else if (rootToken === "super") {
            if (!module.parent) {
                this.error(
                    node,
                    ErrorCodes.runtime.INVALID_SUPER_REFERENCE,
                    "Cannot use 'super' at the root module.",
                    "'super' refers to a parent module, which doesn't exist at the root level.",
                    "Tried to access parent of the root module.",
                    ["self", "root", "or specific module name"],
                    "'use super::graphics;' in a submodule"
                );
            }
            current = module.parent;
        } else {
            current = module.children.find(m => m.name === rootToken);
            if (!current) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Undefined module: '${rootToken}'`,
                    `The module '${rootToken}' does not exist.`,
                    `Available modules: ${module.children.map(m => `'${m.name}'`).join(", ") || "none"}`,
                    ["existing module name"]
                );
            }
        }

        for (let i = 1; i < node.name.length - 1; i++) {
            const next = node.name[i];
            if (current) {
                current = current.children.find(m => m.name === next);
            }

            if (!current) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Undefined submodule: '${next}'`,
                    `The submodule '${next}' does not exist in '${node.name[i - 1]}'.`,
                    "Tried to traverse a non-existent submodule path.",
                    ["existing submodule"],
                    "use graphics::shapes::Circle;"
                );
            }
        }

        if (current?.frame) {
            return __p(current.frame, node.name[node.name.length - 1]);
        }

        this.error(
            node,
            ErrorCodes.runtime.UNDEFINED_SYMBOL,
            `Symbol '${node.name[node.name.length - 1]}' is not defined in the target module.`,
            "The symbol you tried to access does not exist or is not visible in this module.",
            "Final symbol lookup failed.",
            ["existing symbol"]
        );
    }

    async visitScopedIdentifier(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const symbol = this.getScopedSymbol(node, { frame, module });


        return symbol;
    }

    async visitEnum(
        node: EnumNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const newModule = new TC_EnumModule(node.name, frame);
        const new_frame = newModule.frame;
        module.add_submodule(newModule);

        const placeholder = {
            tag: "TSum",
            tsum: {
                name: node.name,
                variants: {}
            }
        };

        const _enum = {
            type: "type",
            value: placeholder
        };

        frame.define(node.name, _enum);

        if (node.type_parameters) {
            for (const src of node.type_parameters) {
                await this.visit(src, { frame: new_frame, module });
            }
        }

        const variants: Record<string, Types> = {};

        for (const src of node.body) {
            const type = await this.visit(src, { frame: new_frame, module: newModule });

            if (type?.type == "type") {
                variants[src.name] = type.value;
            }

        }

        placeholder.tsum.variants = variants;

        return _enum;
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { frame, module }: { frame: TypeFrame, module: Module }
    ) {
        if (!node.value) {
            return {
                type: "type",
                value: tcon("unit", node)
            }
        }

        return await this.visit(node.value, { frame, module })
    }

    async visitTupleVariant(
        node: TupleVariantNode,
        args?: Record<string, any>
    ) {
        const types = [];
        for (const src of node.types) {
            const type = await this.visit(src, args);

            if (type?.type == "type") {
                types.push(type.value);
            }
        }

        return {
            type: "type",
            value: tcon_ex("()", types, node, TupleTypes.get_instance())
        }
    }

    async visitStruct(
        node: StructNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const newModule = new TC_StructModule(node.name, frame);
        node.module = newModule;
        module.add_submodule(newModule);

        const new_frame = newModule.frame;

        const placeholder = {
            tag: "TRec",
            trec: {
                name: node.name,
                types: {}
            }
        };

        const struct = {
            type: "type",
            value: placeholder
        };

        frame.define(node.name, struct);

        const types: Record<string, Types> = {};

        for (const src of node.body) {
            if (src instanceof FunctionDecNode) continue;

            const name = src instanceof FieldNode ? src.field.name : "";

            const t = await this.visit(src, { frame: new_frame, module: newModule })

            if (t?.type == "type") {
                types[name] = t.value;
            }
        }

        placeholder.trec.types = types;

        return struct;
    }

    async visitField(node: FieldNode, args?: Record<string, any>) {
        return this.visit(node.data_type, args);
    }

    async visitString(node: StringNode, args?: Record<string, any>) {
        return {
            type: "type",
            value: tcon("str", node)
        }
    }

    async visitNumber(node: NumberNode, args?: Record<string, any>) {
        return {
            type: "type",
            value: tcon("num", node)
        }
    }

    async visitBoolean(node: BooleanNode, args?: Record<string, any>) {
        return {
            type: "type",
            value: tcon("bool", node)
        }
    }

    async resolve_type(node: TypeNode, typeName: string, methods: any, frame: TypeFrame) {
        if (node.types) {
            const elem = await this.visit(node.types[0], { frame });

            if (elem?.type == "type")
                return tcon_ex(typeName, [elem?.value], node, methods);
        }
        throw new Error(`Expected type parameters for ${typeName}`);
    }

    async visitType(
        node: TypeNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        if (node.genericParams) {
            for (let src of node.genericParams) {
                await this.visit(src, { frame, module });
            }
        }

        if (node.name in this.primitives) {
            return {
                type: "type",
                value: tcon(node.name, node, this.primitives[node.name])
            }
        } else if (node.name == "->") {
            if (node.types) {
                const params = node.types.slice(0, node.types.length - 1);
                const ret_type = node.types[node.types.length - 1];

                let p_types = [], r_type = await this.visit(ret_type, { frame, module });

                for (let p of params) {
                    let m = await this.visit(p, { frame, module });

                    if (m?.type == "type")
                        p_types.push(m.value)
                }

                if (r_type?.type == "type") {
                    const fun = tfun(tcon_ex("Array", p_types, null), r_type.value, node);

                    return {
                        type: "type",
                        value: fun
                    }
                }
            }
        } else if (node.name == "tuple") {
            return {
                type: "type",
                value: await this.resolve_type(node, "()", TupleTypes.get_instance(), frame)
            };
        } else if (node.name == "Array") {
            return {
                type: "type",
                value: await this.resolve_type(node, "[]", ArrayTypes.get_instance(), frame)
            };
        } else {
            let value = frame.get(node.name);

            if (value) return value;

            this.error(
                node,
                'MISSING_GENERIC_TYPE',
                `Couldn't find generic type <${node.name}>`
            )
        }
    }

    async visitTypeParameter(
        node: TypeParameterNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const tv: Types = tvar(node, node.name);

        frame.define(node.name, {
            type: "type",
            value: tv
        });

        return tv;
    }
}