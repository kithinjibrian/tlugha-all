import {
    AliasNode,
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    CallExpressionNode,
    EEnv,
    EnumModule,
    EnumNode,
    EnumPatternNode,
    EnumVariantNode,
    ErrorCodes,
    ExpressionStatementNode,
    FieldNode,
    FieldPatternNode,
    FunctionDecNode,
    IdentifierNode,
    IfElseNode,
    ImplNode,
    LambdaNode,
    MatchArmNode,
    MatchNode,
    MemberExpressionNode,
    Module,
    ModuleNode,
    NumberNode,
    ParameterNode,
    ParametersListNode,
    PathNode,
    ProgramNode,
    ReturnNode,
    SourceElementsNode,
    StringNode,
    StructInitNode,
    StructModule,
    StructNode,
    StructPatternNode,
    TError,
    TupleNode,
    TuplePatternNode,
    TupleVariantNode,
    TypeNode,
    TypeParameterNode,
    UseNode,
    VariableNode,
    VariableStatementNode
} from "../types";
import { global_counter } from "./gen";
import { TypeSolver } from "./solver";

import {
    BagType,
    FunctionType,
    OFType,
    StructType,
    Type,
    TypeVariable
} from "./tc_type";
import { TypeScheme } from "./typescheme";

export * as TCE from "./tc_type";
export * as TC_GEN from "./gen";
export * as TC_SCHEME from "./typescheme";

export class TC implements ASTVisitor {
    public pipes: any = [];
    public tsolver: TypeSolver = new TypeSolver();
    public primitives: Record<any, any> = {
        "num": ["core", "types", "Num"],
        "bool": ["core", "types", "Bool"],
        "str": ["core", "types", "Str"],
        "unit": ["core", "types", "Unit"],
        "Map": ["core", "types", "Map"],
        "Set": ["core", "types", "Set"],
        "Tuple": ["core", "types", "Tuple"],
        "Array": ["core", "types", "Array"],
    }

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
        //  console.log("typechecker", node.type)
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


        console.log("DONE COLLECTING CONSTRAINTS!!!")
        this.tsolver.solve();
        console.log("DONE TYPECHECKING!!!")
    }

    private fresh_tvar(deps: ASTNode[]) {
        const tvar = new TypeVariable(`TVAR${global_counter.next().value}`);
        deps.map(dep => tvar.add_dependenacy(dep));
        return tvar;
    }

    private get_scoped_scheme(
        node: PathNode,
        { env, module }: { env: EEnv; module: Module }
    ): TypeScheme {
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
                    let root = Module.get_root(module);
                    current = root.children.find(m => m.name === rootToken);

                    // If still not found, check if it's the root module itself
                    if (!current && root.name === rootToken) {
                        current = root;
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
                const scheme = mod.env.get(item.name) as TypeScheme;

                // get the type out of the scheme
                const type = scheme.instantiate();
                if (type instanceof StructType) {
                    module.add_submodule(type.module);
                }

                env.define(item.alias ?? item.name, scheme);
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

        const path = new PathNode(null, ["core", "types", "Unit"]);
        const scheme = await this.get_scoped_scheme(path, { env, module });

        return scheme.type;
    }

    async member_call(
        node: CallExpressionNode,
        args: Type[],
        { env, module }: { env: EEnv, module: Module }
    ) {
        if (!(node.callee instanceof MemberExpressionNode)) throw new Error("");

        const a = await this.visitMemberExpression2(node.callee, { env, module })

        if (!a) throw new Error("Callee is undefined.");

        const ret = this.fresh_tvar([node]);

        if (a instanceof OFType) {
            const expected = new FunctionType(new BagType([a.obj, ...args]), ret)
            const type = a.field.instantiate();

            this.tsolver.collect_exp(
                type,
                new TypeScheme([], expected),
            );
        } else if (a instanceof TypeVariable) {
            const expected = new FunctionType(new BagType([a, ...args]), ret);

            this.tsolver.collect_exp(
                a,
                new TypeScheme([], expected),
            );
        }

        return ret;
    }

    async visitMemberExpression2(
        node: MemberExpressionNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const obj = await this.visit(node.object, { env, module });

        if (!obj) throw new Error("Object is undefined.");

        let prop: string | undefined = undefined;
        if (node.property instanceof IdentifierNode) {
            prop = node.property.name;
        }

        if (!prop) throw new Error("Property is undefined.");

        if (obj instanceof StructType) {
            const field = obj.methods.get(prop);

            if (!field) throw new Error("Field is undefined.");

            return new OFType(obj, field);
        }

        const fresh = this.fresh_tvar([]);

        this.tsolver.collect_ma(obj, fresh, prop);

        return fresh;
    }

    async visitMemberExpression(
        node: MemberExpressionNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const obj = await this.visit(node.object, { env, module });

        if (!obj) throw new Error("Object is undefined.");

        let prop: string | undefined = undefined;
        if (node.property instanceof IdentifierNode) {
            prop = node.property.name;
        }

        if (!prop) throw new Error("Property is undefined.");

        if (obj instanceof StructType) {
            const field_scheme = obj.fields.get(prop);

            if (!field_scheme) throw new Error("Field is undefined.");

            return field_scheme.instantiate();
        }

        const fresh = this.fresh_tvar([]);

        this.tsolver.collect_fa(obj, fresh, prop);

        return fresh;
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const args: Type[] = [];

        for (const arg of node.args) {
            const argType = await this.visit(arg, { env, module });
            if (argType) args.push(argType);
        }

        if (node.callee instanceof MemberExpressionNode) {
            return await this.member_call(node, args, { env, module });
        }

        const callee = await this.visit(node.callee, { env, module });

        if (!callee) throw new Error("Callee is undefined.");

        const ret = this.fresh_tvar([node]);
        const expected = new FunctionType(new BagType(args), ret);

        this.tsolver.collect_exp(
            callee,
            new TypeScheme([], expected)
        )

        return ret;
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
        let def_type: Type | undefined;
        if (node.data_type) {
            def_type = await this.visit(node.data_type, { env, module });
        }

        if (node.expression) {
            const type = await this.visit(node.expression, { env, module });

            if (!type) throw new Error("Variable type is undefined.");

            if (type instanceof TypeVariable) {
                type.dependenacies.push(node);
            } else {
                node.data_type = type;
            }

            const scheme = this.tsolver.collect_imp(type, env);

            env.define(node.identifier.name, scheme);

            if (def_type) {
                this.tsolver.collect_exp(
                    type,
                    new TypeScheme([], def_type)
                );
            }

            return;
        }

        if (def_type) {
            const type_var = this.fresh_tvar([node]);

            this.tsolver.collect_exp(
                type_var,
                new TypeScheme([], def_type)
            );

            env.define(node.identifier.name, new TypeScheme([], type_var));
        }
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_env = new EEnv(env);

        const free_vars = [];
        if (node.type_parameters) {
            for (let src of node.type_parameters) {
                free_vars.push(src.name);
                await this.visit(src, { env: new_env, module });
            }
        }

        let p_types = new BagType([]);

        if (node.params) {
            let $ = await this.visit(node.params, { env: new_env, module });
            if ($) p_types = $ as BagType;
        }

        let anno_return = await this.visit(node.return_type, { env: new_env, module });

        if (!anno_return) throw new Error("Return type is undefined.");

        let rt = await this.visit(node.body, { env: new_env, module });

        if (!rt) throw new Error("Function body must return a type");

        this.tsolver.collect_eq(anno_return, rt);

        const fun_type = new FunctionType(p_types, rt);

        const scheme = this.tsolver.collect_imp(fun_type, env);

        env.define(node.identifier.name, scheme);

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
        if (node.data_type) {
            const type = await this.visit(node.data_type, { env, module });

            if (type) {

                if (type instanceof TypeVariable) {
                    type.dependenacies.push(node);
                } else {
                    node.data_type = type;
                }

                env.define(node.identifier.name, new TypeScheme([], type));
                return type;
            }
        }

        const ft = this.fresh_tvar([node]);

        env.define(node.identifier.name, new TypeScheme([], ft));

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

    async visitReturn(
        node: ReturnNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const expr = await this.visit(node.expression, { env, module });

        return expr;
    }

    async visitIfElse(
        node: IfElseNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const cond = await this.visit(node.condition, { env, module });

        if (cond) {
            const path = new PathNode(null, ["core", "Bool"]);
            const scheme = await this.get_scoped_scheme(path, { env, module });
            this.tsolver.collect_eq(cond, scheme.instantiate());
        }

        const consequent = await this.visit(node.consequent, { env, module });

        if (node.alternate) {
            const alternate = await this.visit(node.alternate, { env, module });

            if (alternate && consequent) {
                this.tsolver.collect_eq(consequent, alternate);
            }
        }

        return consequent;
    }

    async visitMatch(
        node: MatchNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const scrutinee = await this.visit(node.expression, { env, module });

        if (!scrutinee) {
            throw new Error("Scrutinee must be a type");
        }

        const ret = this.fresh_tvar([]);

        for (const arm of node.arms) {
            const arm_type = await this.visit(arm, {
                env,
                module,
                scrutinee
            });

            if (arm_type) {
                this.tsolver.collect_eq(ret, arm_type);
            }
        }

        return ret;
    }

    async visitMatchArm(
        node: MatchArmNode,
        { env, scrutinee, module }: { env: EEnv, scrutinee: Type, module: Module }
    ) {
        const pattern = await this.visit(node.pattern, { env, scrutinee, module });


        if (!pattern) {
            throw new Error("Pattern must be a type");
        }

        this.tsolver.collect_eq(scrutinee, pattern);

        return await this.visit(node.exp_block, { env, module });
    }

    async visitEnumPattern(
        node: EnumPatternNode,
        { env, scrutinee, module }: { env: EEnv, scrutinee: Type, module: Module }
    ) {
        // get the scheme 
        const scheme = await this.get_scoped_scheme(node.path as PathNode, { env, module });

        const inst = scheme.instantiate();

        if (!(inst instanceof FunctionType)) throw new Error("");

        if (node.patterns) {
            for (let i = 0; i < node.patterns.length; i++) {
                const pattern = node.patterns[i];

                await this.visit(pattern, {
                    env,
                    bind: true,
                    value: inst.argTypes.types[i],
                    module
                });
            }
        }

        this.tsolver.collect_bag(scrutinee, inst.argTypes);

        return inst.returnType;
    }

    async visitStructPattern(
        node: StructPatternNode,
        { env, scrutinee, module }: { env: EEnv, scrutinee: Type, module: Module }
    ) {
        const scheme = await this.get_scoped_scheme(node.path as PathNode, { env, module });

        const inst = scheme.instantiate();

        if (!(inst instanceof StructType)) throw new Error("");

        for (const pattern of node.patterns) {
            await this.visit(pattern, {
                env,
                module,
                scrutinee,
                inst
            })
        }

        return inst;
    }

    async visitFieldPattern(
        node: FieldPatternNode,
        { env, scrutinee, inst, module }: { env: EEnv, scrutinee: Type, inst: Type, module: Module }
    ) {

        const name = node.iden.name;
        const type = (inst as StructType).fields.get(name);

        await this.visit(node.patterns, {
            env,
            bind: true,
            module,
            value: type?.instantiate()
        });
    }

    async visitEnum(
        node: EnumNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_module = new EnumModule(node.name, env);

        const enum_env = new_module.env;

        const free_vars = [], type_args = [];
        if (node.type_parameters) {
            for (const src of node.type_parameters) {
                free_vars.push(src.name);
                const t = await this.visit(src, { env: enum_env, module });

                if (t) {
                    type_args.push(t);
                }
            }
        }

        const fields = new Map<string, TypeScheme>();
        const methods = new Map<string, TypeScheme>();

        const struct = new StructType(
            node.name,
            new BagType(type_args),
            fields,
            methods,
            new_module,
            "enum"
        );

        module.add_submodule(new_module);

        env.define(node.name, new TypeScheme(free_vars, struct));

        for (const src of node.body) {
            const type = await this.visit(src, { env: enum_env, struct, module });

            if (type) {
                enum_env.define(src.name, new TypeScheme(free_vars, type));
            }
        }
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { env, struct, module }: { env: EEnv, struct: StructType, module: Module }
    ) {
        if (node.value) {
            return await this.visit(node.value, { env, struct, module });
        }

        const fun = new FunctionType(
            new BagType([]),
            struct,
            "enum_variant"
        );

        return fun;
    }

    async visitTupleVariant(
        node: TupleVariantNode,
        { env, struct, module }: { env: EEnv, struct: StructType, module: Module }
    ) {
        const types: Type[] = [];

        for (const t of node.types) {
            const tp = await this.visit(t, { env, module })
            if (tp)
                types.push(tp);
        }

        const fun = new FunctionType(
            new BagType(types),
            struct
        );

        return fun;
    }

    async visitStruct(
        node: StructNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const new_module = new StructModule(node.name, env);
        node.module.set("typechecker", new_module);

        const struct_env = new_module.env;

        const free_vars = [], type_args = [];
        if (node.type_parameters) {
            for (const src of node.type_parameters) {
                free_vars.push(src.name);
                const t = await this.visit(src, { env: struct_env, module });

                if (t) {
                    type_args.push(t);
                }
            }
        }

        const fields = new Map<string, TypeScheme>();
        const methods = new Map<string, TypeScheme>();

        for (const src of node.body) {
            const name = src instanceof FieldNode ? src.field.name : "";
            const field_type = await this.visit(src, { env: struct_env, module });

            if (field_type) {
                fields.set(name, new TypeScheme([], field_type));
            }
        }

        const struct = new StructType(
            node.name,
            new BagType(type_args),
            fields,
            methods,
            new_module
        );

        env.define(node.name, new TypeScheme(free_vars, struct));

        module.add_submodule(new_module);
    }

    async visitField(
        node: FieldNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        return await this.visit(node.data_type, { env, module });
    }

    async visitStructInit(
        node: StructInitNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const type = await this.visit(node.name, { env, module });

        if (!type || !(type instanceof StructType)) throw new Error("Struct type is undefined.");

        const free_fields: string[] = [], free_types: { [key: string]: Type } = {};
        for (const [key, scheme] of type.fields.entries()) {
            if (scheme.type instanceof TypeVariable) {
                free_fields.push(key);
            }
        }

        const fields = new Map<string, TypeScheme>();

        for (const { iden, expression } of node.fields) {
            const field_type = await this.visit(
                expression ?? iden, { env, module }
            );

            if (!field_type) throw new Error("Field type is undefined.");

            if (free_fields.includes(iden.name)) {
                free_types[iden.name] = field_type;
            }

            fields.set(iden.name, new TypeScheme([], field_type));
        }

        const args = [];
        for (const key of free_fields) {
            args.push(free_types[key]);
        }

        const struct = new StructType(
            type.name,
            new BagType(args),
            fields,
            type.methods,
            type.module
        )

        return struct;
    }

    async visitImpl(
        node: ImplNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        // get the object manually bcoz we are updating it and not instantiating it
        const path = new PathNode(null, [node.iden.name]);
        const scheme = this.get_scoped_scheme(path, { env, module });

        const struct = scheme.type;

        if (!struct || !(struct instanceof StructType))
            throw new Error("Impl type must be a struct");

        const new_env = new EEnv(env);
        // figure out how to insert Self into env
        // new_env.define("Self", new TypeScheme([], struct));

        for (const src of node.body) {

            // function dec will add the scheme to our impl env
            const impl_type = await this.visit(src, { env: new_env, module }) as FunctionType;

            if (!impl_type) throw new Error("Impl type is undefined.");

            const impl_scheme = new_env.get(src.identifier.name);

            struct.module.env.define(src.identifier.name, impl_scheme);
            struct.methods.set(src.identifier.name, impl_scheme);
        }
    }

    async visitAlias(
        node: AliasNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const free_vars = [];
        if (node.type_parameters) {
            for (const src of node.type_parameters) {
                free_vars.push(src.name);
                const t = await this.visit(src, { env, module });
            }
        }

        const type = await this.visit(node.data_type, { env, module });

        if (type) {
            //  type.alias(node.identifier.name);
            env.define(node.identifier.name, new TypeScheme(free_vars, type));
        }
    }

    async visitType(
        node: TypeNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const params = [];
        if (node.types) {
            for (const src of node.types) {
                const t = await this.visit(src, { env, module });
                if (t)
                    params.push(t);
            }
        }

        if (node.name in this.primitives) {
            const path = new PathNode(null, this.primitives[node.name]);
            let scheme = this.get_scoped_scheme(path, { env, module });

            return scheme.instantiate();
        }

        let value = env.get(node.name);

        if (value instanceof TypeScheme) {
            const type = value.instantiate();

            if (type instanceof StructType) {
                type.args = new BagType(params);
            }

            return type;
        }

        this.error(
            node,
            'MISSING_GENERIC_TYPE',
            `Couldn't find generic type <${node.name}>`
        )
    }

    async visitTypeParameter(
        node: TypeParameterNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const tv = new TypeVariable(node.name);

        env.define(node.name, new TypeScheme([], tv));

        return tv;
    }

    async visitPath(
        node: PathNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        let scheme = this.get_scoped_scheme(node, { env, module });

        const inst = scheme.instantiate();

        return inst;
    }

    async visitIdentifier(
        node: IdentifierNode,
        { env, bind, value, module }: { env: EEnv, bind: boolean, value: any, module: Module }
    ) {
        if (bind) {
            env.define(node.name, new TypeScheme([], value));

            return value;
        } else {
            const path = new PathNode(null, [node.name]);
            const scheme = this.get_scoped_scheme(path, { env, module });

            const inst = scheme.instantiate();

            return inst;
        }
    }

    async visitTuple(
        node: TupleNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "types", "Tuple"]);
        const scheme = await this.get_scoped_scheme(path, { env, module });

        let elems = [];
        for (const src of node.values) {
            const ty = await this.visit(src, { env, module });

            if (ty) {
                elems.push(ty);
            }
        }

        const type = scheme.instantiate() as StructType;
        type.args = new BagType(elems);

        return type;
    }

    async visitNumber(
        node: NumberNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "types", "Num"]);
        const scheme = this.get_scoped_scheme(path, { env, module });

        return scheme.type;
    }

    async visitBoolean(
        node: BooleanNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "types", "Bool"]);
        const scheme = this.get_scoped_scheme(path, { env, module });

        return scheme.type;
    }

    async visitString(
        node: StringNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const path = new PathNode(null, ["core", "types", "Str"]);
        const scheme = this.get_scoped_scheme(path, { env, module });

        return scheme.type;
    }
}