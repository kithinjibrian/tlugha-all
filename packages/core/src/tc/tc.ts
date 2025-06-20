import {
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    CallExpressionNode,
    EEnv,
    ErrorCodes,
    ExpressionStatementNode,
    FunctionDecNode,
    IdentifierNode,
    ImplNode,
    LambdaNode,
    MemberExpressionNode,
    Module,
    ModuleNode,
    NumberNode,
    ParameterNode,
    ParametersListNode,
    PathNode,
    ProgramNode,
    SourceElementsNode,
    StringNode,
    StructModule,
    StructNode,
    TError,
    UseNode,
    VariableNode,
    VariableStatementNode
} from "../types";
import { TypeSolver } from "./solver";
import { gen_id } from "./gen";

import { BagType, FunctionType, OFType, StructType, Type, TypeVariable } from "./tc_type";

let global_counter = gen_id();

export class TC implements ASTVisitor {
    public pipes: any = [];
    public tsolver: TypeSolver = new TypeSolver();

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public ast?: ASTNode,
    ) {
        // console.log(file);
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
        console.log("typechecker", node.type)
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<Type | undefined> {
        if (node == undefined) return;

        try {
            return await node.accept(this, args);
        } catch (error) {
            throw error;
        }
    }

    public async after_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
    }

    async start(tc: TC) {
        if (tc.ast) {
            await tc.visit(tc.ast, { env: tc.root.env, module: tc.root });
        }
    }

    async run(ext_ignore?: boolean) {
        this.pipes.push(this.start);

        const pipes = this.pipes;

        let index = 0;
        const next = async () => {
            const pipe = pipes[index++];

            if (pipe) {
                await pipe(this, next);
            }
        }

        await next();

        this.tsolver.solve();

        console.log("DONE TYPECHECKING!!!")
    }

    private fresh_tvar(deps: ASTNode[]) {
        const tvar = new TypeVariable(`T${global_counter.next().value}`);
        deps.map(dep => tvar.add_dependenacy(dep));
        return tvar;
    }

    private get_scoped_type(
        node: PathNode,
        { env, module }: { env: EEnv; module: Module }
    ) {
        //   console.log(this.root);

        const resolve_type = (search_frame: EEnv, name: string) => {
            const type = search_frame.get(name);

            if (!type) {
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

            return type;
        };

        // Handle single-name symbol lookup
        if (node.name.length === 1) {
            return resolve_type(env, node.name[0]);
        }

        // Resolve root of the path
        let current: Module | undefined;
        const rootToken = node.name[0];

        switch (rootToken) {
            case "root":
                current = this.root;
                break;
            case "self":
                current = module;
                break;
            case "super":
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
                break;
            default:
                // Try resolving from current module
                current = module.children.find(m => m.name === rootToken);

                // If not found, try from root
                if (!current) {
                    current = this.root.children.find(m => m.name === rootToken);

                    // If still not found, check if it's the root module itself
                    if (!current && this.root.name === rootToken) {
                        current = this.root;
                    }

                    if (!current) {
                        this.error(
                            node,
                            ErrorCodes.runtime.UNDEFINED_MODULE,
                            `Undefined module: '${rootToken}'`,
                            `The module '${rootToken}' does not exist.`,
                            `Available modules: ${this.root.children.map(m => `'${m.name}'`).join(", ") || "none"}`,
                            ["existing module name"]
                        );
                    }
                }
        }

        // Traverse submodules in the path
        for (let i = 1; i < node.name.length - 1; i++) {
            const submoduleName = node.name[i];
            current = current?.children.find(m => m.name === submoduleName);

            if (!current) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Undefined submodule: '${submoduleName}'`,
                    `The submodule '${submoduleName}' does not exist in '${node.name[i - 1]}'.`,
                    "Tried to traverse a non-existent submodule path.",
                    ["existing submodule"],
                    "use graphics::shapes::Circle;"
                );
            }
        }

        // Final symbol lookup in resolved module's env
        if (current?.env) {
            const finalName = node.name[node.name.length - 1];
            const symbol = resolve_type(current.env, finalName);

            return symbol;
        }

        // Fallback error if no env found
        this.error(
            node,
            ErrorCodes.runtime.UNDEFINED_SYMBOL,
            `Symbol '${node.name[node.name.length - 1]}' is not defined in the target module.`,
            "The symbol you tried to access does not exist or is not visible in this module.",
            "Final symbol lookup failed.",
            ["existing symbol"]
        );
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

    async visitModule(
        node: ModuleNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_mod = new Module(node.identifier.name);
        module.add_submodule(new_mod);

        for (const src of node.body) {
            await this.visit(src, { env: new_mod.env, module: new_mod });
        }
    }

    async visitUse(
        node: UseNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        console.log("---------------");

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
                console.log(module);

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
                const type = mod.env.get(item.name);

                if (type instanceof StructType) {
                    module.add_submodule(type.module);
                }

                env.define(item.alias ?? item.name, type);
            });
        } else {
            const path = node.path.path;
            const mod = resolveModule(path.slice(0, -1));
            if (!mod) return;
        }
    }

    async visitExpressionStatement(
        node: ExpressionStatementNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visit(node.expression, { env, module });
    }

    async member_call(
        node: CallExpressionNode,
        args: Type[],
        { env, module }: { env: EEnv, module: Module }
    ) {
        const a = await this.visit(node.callee, { env, module });

        if (!a || !(a instanceof OFType)) throw new Error("Callee is undefined.");

        const return_type = this.fresh_tvar([node]);

        const expected = new FunctionType(new BagType([a.obj, ...args]), return_type);

        this.tsolver.collect_eq(a.field, expected);

        return return_type;
    }

    async visitMemberExpression(
        node: MemberExpressionNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const obj = await this.visit(node.object, { env, module });

        let prop: string | undefined = undefined;
        if (node.property instanceof IdentifierNode) {
            prop = node.property.name;
        }

        if (!prop) throw new Error("Property is undefined.");

        if (obj instanceof StructType) {
            const field = obj.fields.get(prop);

            if (!field) throw new Error("Field is undefined.");

            return new OFType(obj, field);
        }
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        let args: Type[] = [];

        for (const arg of node.args) {
            const result = await this.visit(arg, { env, module });
            if (result)
                args.push(result);
        }

        if (node.callee instanceof MemberExpressionNode) {
            return await this.member_call(node, args, { env, module });
        }

        const callee = await this.visit(node.callee, { env, module });

        if (!callee) throw new Error("Callee is undefined.");

        // call expression should know its return type
        // helps in desugaring some constructs
        const return_type = this.fresh_tvar([node]);

        const expected = new FunctionType(new BagType(args), return_type);

        this.tsolver.collect_eq(callee, expected);

        return return_type;
    }

    async visitVariableList(
        node: VariableStatementNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visit(node.variables, { env, module });
    }

    async visitVariable(
        node: VariableNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const type = await this.visit(node.expression, { env, module });

        env.define(node.identifier.name, type);
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_env = new EEnv(env);

        let p_types = new BagType([]);

        if (node.params) {
            let $ = await this.visit(node.params, { env: new_env, module });
            if ($) p_types = $ as BagType;
        }

        let rt = await this.visit(node.body, { env: new_env, module });

        if (!rt) throw new Error("Function body must return a type");

        const fun_type = new FunctionType(p_types, rt);

        env.define(node.identifier.name, fun_type);

        console.log(`${fun_type}`)

        return fun_type;
    }

    async visitBlock(
        node: BlockNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_env = new EEnv(env);

        let last_expr_type: Type | null = null;

        for (let i = 0; i < node.body.length; i++) {
            const stmt = node.body[i];

            const stmt_type = await this.visit(stmt, { env: new_env, module });

            if (stmt_type !== undefined) {
                last_expr_type = stmt_type;
            }
        }

        return last_expr_type;
    }

    async visitLambda(
        node: LambdaNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_env = new EEnv(env);

        let p_types = new BagType([]);

        if (node.params) {
            let $ = await this.visit(node.params, { env: new_env, module });
            if ($) p_types = $ as BagType;
        }

        let rt = await this.visit(node.body, { env: new_env, module });

        if (!rt) throw new Error("Lambda body must return a type");

        const fun_type = new FunctionType(p_types, rt);

        return fun_type;
    }

    async visitParametersList(
        node: ParametersListNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const params: Type[] = [];

        for (const n of node.parameters) {
            const t = await this.visit(n, { env, module });

            if (t) {
                params.push(t);
            }
        }

        return new BagType(params);
    }

    async visitParameter(
        node: ParameterNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const ft = this.fresh_tvar([node]);

        env.define(node.identifier.name, ft);

        return ft;
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        args?: Record<string, any>
    ) {
        const left = await this.visit(node.left, args);
        const right = await this.visit(node.right, args);

        if (!left || !right) return;

        switch (node.operator) {
            case "+":
            case "-":
            case "*":
            case "/":
                this.tsolver.collect_eq(left, right);
                return left;
        }

        throw new Error(`Unsupported operator: ${node.operator}`);
    }

    async visitStruct(
        node: StructNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_module = new StructModule(node.name, env);
        node.module.set("typechecker", new_module);

        const struct = new StructType(
            node.name,
            new Map<string, Type>(),
            new_module
        );

        env.define(node.name, struct);

        module.add_submodule(new_module);
    }

    async visitImpl(
        node: ImplNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const obj = await this.visit(node.iden, { env, module });

        for (const src of node.body) {
            const new_env = new EEnv(env);
            new_env.define("Self", obj);

            const impl_type = await this.visit(src, { env: new_env, module }) as FunctionType;

            if (!impl_type) throw new Error("Impl type is undefined.");

            if (obj instanceof StructType) {
                obj.module.env.define(src.identifier.name, impl_type);
                obj.fields.set(src.identifier.name, impl_type);
            }
        }

    }

    async visitPath(
        node: PathNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        let type = this.get_scoped_type(node, { env, module });

        return type;
    }

    async visitIdentifier(
        node: IdentifierNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, [node.name]);
        const type = this.get_scoped_type(path, { env, module });

        return type;
    }

    async visitNumber(
        node: NumberNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "Num"]);
        const type = this.get_scoped_type(path, { env, module });

        return type;
    }

    async visitString(
        node: StringNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "Str"]);
        const type = this.get_scoped_type(path, { env, module });

        return type;
    }
}