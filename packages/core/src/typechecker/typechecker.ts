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
    FieldNode
} from "../types";
import { HM, Ret } from "./hm";
import { tcon, tcon_ex, tfun, tvar, Types } from "./type";

export class TypeChecker implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("typechecker");
    public hm: HM;
    public primitives: string[] = ["num", "bool", "str", "unit", "Self"]
    public subst: Map<any, any> = new Map();

    constructor(
        public file: string,
        public ast: ASTNode | null,
        public root: TC_Module,
        public lugha: Function
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

    async run() {

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
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        await this.visit(node.expression, { frame, module });

        return {
            type: "type",
            value: tcon("unit", node)
        };
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
                    this.error(
                        paramNode,
                        "INVALID_TYPE_ARGUMENT",
                        "Expected a valid type in generic call."
                    );
                }

                type_params.push(result.value);
            }

            // Optional: Check arity matches function's expected generic count
            // this.checkTypeParameterArity(instantiated, type_params.length, node);
        }

        const instantiated = this.hm.instantiate(callee.value, type_params);

        // Visit argument expressions and collect their types
        const args: Types[] = [];

        for (const argNode of node.args) {
            const result = await this.visit(argNode, {
                frame,
                expression: true,
                module,
            });

            if (!result || result.type !== "type") {
                this.error(argNode, "INVALID_ARGUMENT_TYPE", "Expected a value expression.");
            }

            args.push(result.value);
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

    async visitIfElse(
        node: IfElseNode,
        { frame, expression, module }: { frame: TypeFrame, expression?: boolean, module: TC_Module }
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
    ) {
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

    async visitStruct(
        node: StructNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        const newModule = new TC_StructModule(node.name, frame);
        node.module = newModule;
        module.add_submodule(newModule);

        const new_frame = newModule.frame;

        const types: Record<string, Types> = {};

        for (const src of node.body) {
            const name = src instanceof FieldNode ? src.field.name : "";

            const t = await this.visit(src, { frame: new_frame, module: newModule })

            if (t?.type == "type") {
                types[name] = t.value;
            }
        }

        const struct = {
            type: "type",
            value: {
                tag: "TRec",
                trec: {
                    name: node.name,
                    types
                }
            }
        }

        frame.define(node.name, struct);

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

    async visitType(
        node: TypeNode,
        { frame, module }: { frame: TypeFrame, module: TC_Module }
    ) {
        if (this.primitives.includes(node.name)) {
            return {
                type: "type",
                value: tcon(node.name, node)
            }
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