import { Types } from "../typechecker/type";
import {
    ArrayNode,
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    CallExpressionNode,
    ExpressionStatementNode,
    ExtensionStore,
    FunctionDecNode,
    IdentifierNode,
    ImplNode,
    MatchArmNode,
    MatchNode,
    MemberExpressionNode,
    Module,
    NumberNode,
    ParameterNode,
    ParametersListNode,
    PathNode,
    PostfixOpNode,
    ProgramNode,
    replace_node,
    SourceElementsNode,
    StringNode,
    TError,
    TupleNode,
    VariableNode,
    VariableStatementNode,
    WhileNode,
    EEnv
} from "../types";


export class DesugarTC implements ASTVisitor {
    private extension: ExtensionStore<unknown> =
        ExtensionStore.get_instance("desugar_tc");

    public pipes: any = [];

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public ast?: ASTNode,
    ) {
        //  console.log("----------------->", file);
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
            stage: 'desugar_tc',
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
        //  console.log("desugartc", node.type)
        for (const ext of this.extension.get_extensions()) {
            await ext.before_accept?.(node, this, args)
        }
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<any> {
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

    async start(tc: DesugarTC) {
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

        console.log("DONE DESUGARING TC!!!")
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

    async visitFunctionDec(node: FunctionDecNode, args?: Record<string, any>) {
        await this.visit(node.params, args);
        await this.visit(node.body, args);
    }

    async visitParametersList(node: ParametersListNode, args?: Record<string, any>) {
        for (const param of node.parameters) {
            await this.visit(param, args);
        }
    }

    async visitParameter(
        node: ParameterNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        env.define(node.identifier.name, node.data_type);
    }

    async visitBlock(node: BlockNode, args?: Record<string, any>) {
        for (const n of node.body) {
            await this.visit(n, args);
        }
    }

    async visitExpressionStatement(
        node: ExpressionStatementNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        await this.visit(node.expression, { env, module });
    }

    async visitVariableList(node: VariableStatementNode, args?: Record<string, any>) {
        await this.visit(node.variables, args);
    }

    async visitVariable(
        node: VariableNode,
        { env, module }: { env: EEnv, module: Module }
    ) {
        //  console.log(node.data_type);

        env.define(node.identifier.name, node.data_type);

        await this.visit(node.expression, { env, module });
    }

    async visitMatch(node: MatchNode, args?: Record<string, any>) {
        await this.visit(node.expression, args);

        for (const arm of node.arms) {
            await this.visit(arm, args);
        }
    }

    async visitMatchArm(node: MatchArmNode, args?: Record<string, any>) {
        await this.visit(node.pattern, args);
        await this.visit(node.exp_block, args);
    }

    async visitCallExpression(
        node: CallExpressionNode,
        args?: Record<string, any>
    ) {
        for (let arg of node.args) {
            await this.visit(arg, args);
        }

        if (node.callee instanceof MemberExpressionNode) {
            const type = await this.visit(node.callee, { ...args, type: "methods" });
            const prop = await this.visit(node.callee.property);

            const new_call = new CallExpressionNode(
                node.token,
                new PathNode(
                    null,
                    [...type, prop]
                ),
                [node.callee.object, ...node.args]
            );

            new_call.data_type = node.data_type;

            replace_node(node, new_call);
        }

        if (node.data_type) {
            return this.type(node.data_type);
        }
    }

    async visitMemberExpression(
        node: MemberExpressionNode,
        args?: Record<string, any>
    ) {
        if (node.parent instanceof CallExpressionNode) {
            const t = await this.visit(node.object, args);
            return t;
        }

        const n = await this.visit(node.object, { ...args, type: "raw" });


        if (node.property instanceof IdentifierNode) {
            const type = n.trec.types[node.property.name];

            const $ = this.type(type, "type");

            return $;
        }

        throw new Error("Member expression is computed");
    }

    async visitPostfixOp(node: PostfixOpNode, args?: Record<string, any>) {
        if (node.operator == "?") {
            const result = await this.visit(node.operand, args);
        }
    }

    async visitWhile(node: WhileNode, args?: Record<string, any>) {
        await this.visit(node.expression, args);
        await this.visit(node.body, args);
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        args?: Record<string, any>
    ) {
        // Already typechecked 
        const left = await this.visit(node.left, { ...args, type: "ops" });

        const createCall = (path: string[], leftArg: ASTNode, rightArg: ASTNode): ASTNode => {
            return new CallExpressionNode(
                null,
                new PathNode(null, path),
                [leftArg, rightArg]
            );
        };

        const ops: Record<string, (a: ASTNode, b: ASTNode) => ASTNode> = {
            "+": (a, b) => createCall([...left, "add"], a, b),
            "-": (a, b) => createCall([...left, "sub"], a, b),
            "*": (a, b) => createCall([...left, "mul"], a, b),
            "/": (a, b) => createCall([...left, "div"], a, b),
            "%": (a, b) => createCall([...left, "mod"], a, b),
            "<": (a, b) => createCall([...left, "lt"], a, b),
            "<=": (a, b) => createCall([...left, "lte"], a, b),
            ">": (a, b) => createCall([...left, "gt"], a, b),
            ">=": (a, b) => createCall([...left, "gte"], a, b),
            "==": (a, b) => createCall([...left, "eq"], a, b),
            "!=": (a, b) => createCall([...left, "neq"], a, b),
        }

        const operator = node.operator;

        if (!ops[operator]) {
            throw new Error(`Unsupported operator '${operator}'`);
        }

        const newNode = ops[operator](node.left, node.right);

        replace_node(node, newNode);

        return left;
    }

    type(type: Types, kind: "raw" | "ops" | "methods" | "type" = "ops") {
        if (type.tag == "TCon") {
            switch (type.tcon.name) {
                case "num":
                    return "Num";
                case "Array":
                    if (kind == "methods") {
                        return ["core", "methods", "Array"]
                    }
            }
        }

        if (type.tag == "TRec") {
            switch (type.trec.name) {
                case "Map":
                    if (kind == "methods") {
                        return ["core", "methods", "Map"]
                    }
                    break;
                case "Set":
                    if (kind == "methods") {
                        return ["core", "methods", "Set"]
                    }
                    break;
                case "Array":
                    if (kind == "methods") {
                        return ["core", "methods", "Array"]
                    }
                    break;
                case "Str":
                    if (kind == "methods") {
                        return ["core", "methods", "Str"]
                    }
                    break;
                case "Bool":
                    if (kind == "methods") {
                        return ["core", "methods", "Bool"]
                    }
                case "Num":
                    if (kind == "methods") {
                        return ["core", "methods", "Num"]
                    } else if (kind == "ops") {
                        return ["core", "ops", "Num"]
                    }
                default:
                    if (kind == "raw") {
                        return type;
                    }
                    return [type.trec.name];
            }
        }

        if (type.tag == "TSum") {
            return [type.tsum.name];
        }

        return undefined;
    }

    async visitImpl(node: ImplNode, args?: Record<string, any>) {
        for (const src of node.body) {
            await this.visit(src, args);
        }
    }

    async visitIdentifier(node: IdentifierNode, args?: Record<string, any>) {
        const type = args?.env.get(node.name);

        if (type) {
            if (args?.type) {
                return this.type(type, args.type);
            }
        }

        return node.name;
    }

    async visitArray(
        node: ArrayNode,
        args?: Record<string, any>
    ) {
        for (const elem of node.elements) {
            await this.visit(elem, args);
        }

        if (args?.type == "methods") {
            return ["core", "methods", "Array"]
        }
    }

    async visitTuple(
        node: TupleNode,
        args?: Record<string, any>
    ) {
        for (const value of node.values) {
            await this.visit(value, args);
        }

        if (args?.type == "methods") {
            return ["core", "methods", "Tuple"]
        }
    }

    async visitNumber(
        node: NumberNode,
        args?: Record<string, any>
    ) {
        if (args?.type == "methods") {
            return ["core", "methods", "Num"]
        }

        if (args?.type == "ops") {
            return ["core", "ops", "Num"]
        }

        return "Num"
    }

    async visitString(
        node: StringNode,
        args?: Record<string, any>
    ) {
        if (args?.type == "methods") {
            return ["core", "methods", "Str"]
        }

        if (args?.type == "ops") {
            return ["core", "ops", "Str"]
        }

        return "Str"
    }
}