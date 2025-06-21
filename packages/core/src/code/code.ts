import { StructType } from "../tc/tc_type";
import {
    ASTNode,
    ASTVisitor,
    BlockNode,
    CallExpressionNode,
    ExpressionStatementNode,
    FieldNode,
    FunctionDecNode,
    IdentifierNode,
    MemberExpressionNode,
    Module,
    NumberNode,
    ParameterNode,
    ParametersListNode,
    PathNode,
    ProgramNode,
    SourceElementsNode,
    StringNode,
    StructNode,
    TError,
    TupleNode,
    VariableNode,
    VariableStatementNode
} from "../types";

export class CodeGen implements ASTVisitor {
    public pipes: any = [];
    public code: string[] = [];

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public ast?: ASTNode,
    ) {
        // console.log( file);
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
        // console.log("code", node.type)
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<any> {
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

    async start(tc: CodeGen) {
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

        console.log(this.code.join(""));
    }

    write(str: string) {
        this.code.push(str);
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
        args?: Record<string, any>
    ) {
        await this.visit(node.expression, args);
        this.write(";\n")
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        args?: Record<string, any>
    ) {
        this.write("fun ");
        await this.visit(node.identifier, args);
        await this.visit(node.params, args);
        this.write(" ");
        await this.visit(node.body, args);
    }

    async visitParametersList(node: ParametersListNode, args?: Record<string, any>) {
        this.write("(");
        for (const [index, param] of node.parameters.entries()) {
            await this.visit(param, args);

            if (index < node.parameters.length - 1) {
                this.write(", ")
            }
        }
        this.write(")");
    }

    async visitParameter(node: ParameterNode, args?: Record<string, any>) {
        await this.visit(node.identifier, args);
    }

    async visitBlock(node: BlockNode, args?: Record<string, any>) {
        this.write("{\n");
        for (const n of node.body) {
            await this.visit(n, args);
        }
        this.write("\n}\n");
    }

    async visitCallExpression(
        node: CallExpressionNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.callee, args);

        this.write("(")
        for (const [index, arg] of node.args.entries()) {
            await this.visit(arg, args);

            if (index < node.args.length - 1) {
                this.write(", ")
            }
        }

        this.write(")")
    }

    async visitMemberExpression(node: MemberExpressionNode, args?: Record<string, any>) {
        await this.visit(node.object, args);
        this.write(".");
        await this.visit(node.property, args);
    }

    async visitVariableList(
        node: VariableStatementNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.variables, args);
        this.write(";\n");
    }

    async visitVariable(
        node: VariableNode,
        args?: Record<string, any>
    ) {
        if (node.constant) {
            this.write("const");
        } else
            this.write("let");

        if (node.mutable) {
            this.write(" mut");
        }

        this.write(" ");
        await this.visit(node.identifier, args);

        if (node.data_type instanceof StructType) {
            this.write(`: ${node.data_type.toString(false)}`);
        }

        if (node.expression) {
            this.write(" = ");
            await this.visit(node.expression, args);
        }
    }

    async visitPath(
        node: PathNode,
        args?: Record<string, any>
    ) {
        this.write(node.name.join("::"));
    }

    async visitIdentifier(node: IdentifierNode, args?: Record<string, any>) {
        this.write(`${node.name}`);
    }

    async visitStruct(
        node: StructNode,
        args?: Record<string, any>
    ) {
        this.write(`struct ${node.name}`);

        this.write(" {");

        for (const field of node.body) {
            this.write("\n");
            await this.visit(field, args);
        }

        this.write("\n}\n\n");
    }

    async visitField(node: FieldNode, args?: Record<string, any>) {
        await this.visit(node.field, args);
    }

    async visitTuple(node: TupleNode, args?: Record<string, any>) {
        this.write("(");
        for (const [index, value] of node.values.entries()) {
            await this.visit(value, args);
            if (index < node.values.length - 1) {
                this.write(", ")
            }
        }
        this.write(")");
    }

    async visitString(node: StringNode, args?: Record<string, any>) {
        this.write(`"${node.value}"`);
    }

    async visitNumber(node: NumberNode, args?: Record<string, any>) {
        this.write(`${node.value}`);
    }
}