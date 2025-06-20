import { ModuleType } from "../objects/module";
import {
    ASTVisitor,
    ExtensionStore,
    Module,
    ASTNode,
    TError,
    ProgramNode,
    SourceElementsNode,
    EEnv,
    ExpressionStatementNode,
    FunctionDecNode,
    BlockNode,
    VariableStatementNode,
    VariableNode,
    replace_node,
    MatchNode,
    MatchArmNode,
    EnumPatternNode,
    PathNode,
    CallExpressionNode,
    EnumNode,
    EnumModule,
    EnumVariantNode,
    NumberNode,
    TaggedNode,
    ForNode,
    IdentifierNode,
    id,
    MemberExpressionNode,
    WhileNode,
    BooleanNode,
    BreakNode,
    IfLetNode,
    WhileLetNode,
} from "../types";

export type Ret = {
    type: "ast",
    ast: ASTNode
}

export class Desugar implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("desugar");

    public pipes: any = [];

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
            stage: 'desugar',
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
        //console.log("desugar", node.type)
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

    async start(ds: Desugar) {
        if (ds.ast) {
            await ds.visit(ds.ast, { env: ds.root.env, module: ds.root });
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

        console.log("DONE DESUGARING!!!")
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
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visit(node.expression, { env, module });
    }

    async visitEnum(
        node: EnumNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const newModule = new EnumModule(node.name);
        const newFrame = newModule.env;
        module.add_submodule(newModule);

        let enum_counter = 0;

        for (const src of node.body) {
            await this.visit(src, { env: newFrame, enum_counter });

            if (!src.value)
                enum_counter++
        }
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { env, module, enum_counter }: { env: EEnv, module: Module, enum_counter: number }
    ) {
        let variant = node.value ?? new NumberNode(null, enum_counter);
        env.define(node.name, new TaggedNode(null, node.name, variant));
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

    async visitVariableList(
        node: VariableStatementNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.variables, args);
    }

    async visitVariable(
        node: VariableNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.expression, args);
    }

    async visitCallExpression(
        node: CallExpressionNode,
        args?: Record<string, any>
    ) {
        for (const arg of node.args) {
            await this.visit(arg, args);
        }

        return await this.visit(node.callee, args);
    }

    async getScopedSymbol(
        node: PathNode,
        { env, ignore_null_left, module }: { env: EEnv; ignore_null_left?: boolean; module: Module }
    ) {
        const __p = (search_frame: EEnv, name: string) => {
            const symbol = search_frame.get(name);

            if (!symbol && !ignore_null_left) {
                return null
            }

            return symbol;
        };

        let current: Module | undefined;

        if (node.name.length === 1) {
            return __p(env, node.name[0]);
        }

        const rootToken = node.name[0];
        if (rootToken === "root") {
            current = this.root;
        } else if (rootToken === "self") {
            current = module;
        } else if (rootToken === "super") {
            if (!module.parent) {
                return null
            }
            current = module.parent;
        } else {
            current = module.children.find(m => m.name === rootToken);

            if (!current) {
                const val_mod = env.get(rootToken);

                if (val_mod instanceof ModuleType) {
                    current = val_mod.getValue();
                } else {
                    // try searching from the root again
                    current = this.root.children.find(m => m.name === rootToken);

                    if (!current) {
                        return null
                    }
                }
            }
        }

        for (let i = 1; i < node.name.length - 1; i++) {
            const next = node.name[i];
            if (current) {
                current = current.children.find(m => m.name === next);
            }

            if (!current) {
                return null
            }
        }

        if (current?.env) {
            return __p(current.env, node.name[node.name.length - 1]);
        }

        return null
    }

    async visitPath(
        node: PathNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        const symbol = await this.getScopedSymbol(node, { env, module });

        if (symbol) return {
            type: "ast",
            ast: symbol
        }
    }

    async visitFor(
        node: ForNode,
        args?: Record<string, any>
    ) {
        let temp = id(7);
        const new_nodes = [
            new VariableStatementNode(
                null,
                new VariableNode(
                    null,
                    new IdentifierNode(null, temp),
                    false,
                    false,
                    new CallExpressionNode(
                        null,
                        new MemberExpressionNode(
                            null,
                            node.expression,
                            new IdentifierNode(null, "iter"),
                            false
                        ),
                        []
                    )
                )
            ),
            new WhileNode(
                null,
                new BooleanNode(null, true),
                new BlockNode(
                    null,
                    [
                        new MatchNode(
                            null,
                            new CallExpressionNode(
                                null,
                                new MemberExpressionNode(
                                    null,
                                    new IdentifierNode(null, temp),
                                    new IdentifierNode(null, "next"),
                                    false
                                ),
                                []
                            ),
                            [
                                new MatchArmNode(
                                    null,
                                    new EnumPatternNode(
                                        null,
                                        new PathNode(null, ["Some"]),
                                        [
                                            node.variable
                                        ]
                                    ),
                                    null,
                                    node.body
                                ),
                                new MatchArmNode(
                                    null,
                                    new EnumPatternNode(
                                        null,
                                        new PathNode(null, ["None"]),
                                        []
                                    ),
                                    null,
                                    new BreakNode(null)
                                )
                            ]
                        )
                    ]
                )
            )
        ]

        const new_node = new BlockNode(null, new_nodes);

        replace_node(node, new_node);
    }

    visitIfLet(
        node: IfLetNode,
        args?: Record<string, any>
    ) {
        const new_node = new MatchNode(
            null,
            node.expression,
            [
                new MatchArmNode(
                    null,
                    node.pattern,
                    null,
                    node.consequent
                ),
                new MatchArmNode(
                    null,
                    new IdentifierNode(null, "_"),
                    null,
                    node.alternate ? node.alternate : new BlockNode(null, [])
                )
            ]
        );

        replace_node(node, new_node);
    }

    visitWhileLet(node: WhileLetNode, args?: Record<string, any>) {
        const new_node = new WhileNode(
            null,
            new BooleanNode(null, true),
            new BlockNode(null, [
                new MatchNode(
                    null,
                    node.expression,
                    [
                        new MatchArmNode(
                            null,
                            node.pattern,
                            null,
                            node.body
                        ),
                        new MatchArmNode(
                            null,
                            new IdentifierNode(null, "_"),
                            null,
                            new BreakNode(null)
                        )
                    ]
                )
            ])
        )

        replace_node(node, new_node);
    }
}

/**
 let code = `
match c() {
Ok(c) => c,
Err(e) => return Err(e)
}
`;

const lexer = new Lexer(code, "");
const parser = new Parser(lexer.tokenize(), "");
const ast = parser.match_expression({} as any) as MatchNode;


async visitPostfixOp(
        node: PostfixOpNode,
        args?: Record<string, any>
    ) {
        if (node.operator == "?") {
            const result = await this.visit(node.operand, args);

            let name = undefined;

            if (result?.type == "ast") {
                if (result.ast instanceof FunctionDecNode) {
                    let return_type = result.ast.return_type;

                    if (return_type instanceof TypeNode) {
                        name = return_type.name;
                    }
                } else if (result.ast instanceof TaggedNode) {
                    switch (result.ast.name) {
                        case "Ok":
                        case "Err":
                            name = "Result";
                            break;
                        case "Some":
                        case "None":
                            name = "Option";
                            break;
                        case "Option":
                            name = "Option";
                            break;
                        case "Result":
                            name = "Result";
                            break;
                    }
                }
            }


            if (!name || !['Result', 'Option'].includes(name)) {
                this.error(
                    node,
                    'EXPECTED_RESULT_OR_OPTION',
                    `The '?' operator can only be used with Result or Option types, got '${name || 'unknown'}'`,
                    "Ensure the expression returns a Result or Option type",
                    "let x = Some(1); x?  // Valid\nlet y = 42; y?  // Invalid"
                );
            }

            let new_node: ASTNode;

            if (name == "Result") {
                new_node = new MatchNode(
                    null,
                    node.operand,
                    [
                        new MatchArmNode(
                            null,
                            new EnumPatternNode(
                                null,
                                new PathNode(null, ["Ok"]),
                                [
                                    new PathNode(null, ["c"])
                                ]
                            ),
                            null,
                            new PathNode(null, ["c"])
                        ),
                        new MatchArmNode(
                            null,
                            new EnumPatternNode(
                                null,
                                new PathNode(null, ["Err"]),
                                [
                                    new PathNode(null, ["e"])
                                ]
                            ),
                            null,
                            new ReturnNode(
                                null,
                                new CallExpressionNode(
                                    null,
                                    new PathNode(null, ["Err"]),
                                    [
                                        new PathNode(null, ["e"])
                                    ]
                                )
                            )
                        )
                    ]
                )
            } else if (name == "Option") {
                new_node = new MatchNode(
                    null,
                    node.operand,
                    [
                        new MatchArmNode(
                            null,
                            new EnumPatternNode(
                                null,
                                new PathNode(null, ["Some"]),
                                [
                                    new PathNode(null, ["c"])
                                ]
                            ),
                            null,
                            new PathNode(null, ["c"])
                        ),
                        new MatchArmNode(
                            null,
                            new EnumPatternNode(
                                null,
                                new PathNode(null, ["Option", "None"]),
                                []
                            ),
                            null,
                            new ReturnNode(
                                null,
                                new PathNode(null, ["Option", "None"])
                            )
                        )
                    ]
                )
            } else {
                throw new Error(`Unknown name ${name}`); // should never happen
            }

            replace_node(node, new_node);
        }
    }
 */