import { EEnv, TError, Type, VariableNode } from "../../types";
import { ASTNode, ASTVisitor, PlaceholderNode, SourceElementsNode, StringProgNode, TextNode } from "./ast";

export class Engine implements ASTVisitor {
    private str: string[] = [];

    constructor(
        public ast: ASTNode,
        public env: EEnv,
        public values: Type<any>[]
    ) { }

    private write(str: string) {
        this.str.push(str);
    }

    public error(
        ast: ASTNode,
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
            code,
            reason,
            line: token.line,
            column: token.column,
            lineStr: token.line_str,
            stage: 'runtime',
            hint,
            context,
            expected,
            example
        });
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<void> {
        if (node == undefined) return;

        try {
            await node.accept(this, args);
        } catch (error) {
            throw error;
        }
    }

    run() {
        this.visit(this.ast)

        return this.str.join("");
    }

    visitProgString(
        node: StringProgNode,
        args?: Record<string, any>
    ) {
        this.visit(node.program, args);
    }

    visitSourceElements(
        node: SourceElementsNode,
        args?: Record<string, any>
    ) {
        for (const src of node.sources) {
            this.visit(src, args);
        }
    }

    visitText(node: TextNode, args?: Record<string, any>) {
        this.write(node.value);
    }

    // TODO: Can't accept 2 placeholders
    visitPlaceholder(node: PlaceholderNode, args?: Record<string, any>) {
        let fieldValue: any;

        // Get the field value based on the type of the placeholder (index, name, auto)
        if (typeof node.field === 'number') {
            fieldValue = this.values[node.field];
        } else if (typeof node.field == 'string') {
            fieldValue = this.env.get(node.field);
            if (fieldValue instanceof VariableNode) {
                fieldValue = fieldValue.value
            }
        }

        if (fieldValue === undefined) {
            this.error(
                node,
                "PLACEHOLDER_MISSING_VALUE",
                `Value for placeholder '${node.field}' not found.`,
                "Ensure all placeholders have corresponding values in the provided data."
            );
        }

        let formattedValue = JSON.stringify(fieldValue, null, 2);

        if (node.width !== undefined) {
            // Format the value according to width and alignment
            const align = node.alignment || '>'; // Default alignment is right
            formattedValue = fieldValue.toString().padStart(node.width, ' ');
        }

        this.write(formattedValue);
    }
}