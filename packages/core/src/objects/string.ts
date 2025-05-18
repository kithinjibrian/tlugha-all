import {
    ArrayNode,
    BlockNode,
    BoolType,
    ErrorCodes,
    FunctionDecNode,
    IdentifierNode,
    NumberNode,
    ReturnNode,
    StringNode,
    TError,
    Token as MainToken,
    Lexer as MainLexer,
    Engine as MainEngine,
    VariableNode,
    result,
    NumberType
} from "../types";
import { Env, Type } from "./base";
import { FunctionType } from "./function";

enum TokenType {
    Placeholder = "Placeholder",
    Text = "Text",
    EOF = 'EOF',
}

interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    line_str: string;
    parts?: MainToken[]
}

class Lexer {
    private input: string;
    private position: number = 0;
    private column: number = 1;
    private line: number = 1;
    private lines: string[] = [];

    constructor(input: string) {
        this.input = input;
        this.lines = input.split('\n');
    }

    private peek(offset: number = 0): string {
        return this.position + offset < this.input.length ? this.input[this.position + offset] : '\0';
    }

    private advance(): string {
        const char = this.peek();
        this.position++;
        if (char === '\n') {
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    private getCurrentLine(): string {
        return this.lines[this.line - 1] || '';
    }

    public getNextToken(): Token {
        if (this.position >= this.input.length) {
            return { type: TokenType.EOF, value: '', line: this.line, column: this.column, line_str: "" };
        }

        const char = this.peek();

        // Handle placeholder
        if (char === '{') {
            if (this.peek(1) === '{') {
                const startColumn = this.column;
                const startLine = this.line;
                this.advance(); // Skip first '{'
                this.advance(); // Skip second '{'
                return {
                    type: TokenType.Text,
                    value: '{',
                    line: startLine,
                    column: startColumn,
                    line_str: this.getCurrentLine()
                };
            }

            // It's a placeholder
            const startColumn = this.column;
            const startLine = this.line;
            let value = '';
            this.advance(); // Skip '{'

            while (this.peek() !== '}' && this.peek() !== '\0') {
                value += this.advance();
            }


            if (this.peek() === '\0') {
                throw new Error(`Unclosed placeholder at line ${startLine}, column ${startColumn}`);
            }

            this.advance(); // Skip '}'

            const lex = new MainLexer(value, "");
            const tokens = lex.tokenize();

            return {
                type: TokenType.Placeholder,
                value,
                line: startLine,
                column: startColumn,
                line_str: this.lines[startLine - 1],
                parts: tokens.filter((token) => token.type !== "EOF")
            };
        } else if (char === '}' && this.peek(1) === '}') {
            const startColumn = this.column;
            const startLine = this.line;
            this.advance(); // Skip first '}'
            this.advance(); // Skip second '}'
            return {
                type: TokenType.Text,
                value: '}',
                line: startLine,
                column: startColumn,
                line_str: this.getCurrentLine()
            };
        } else {
            const startColumn = this.column;
            const startLine = this.line;
            let value = '';

            while (
                this.peek() !== '{' &&
                !(this.peek() === '}' && this.peek(1) === '}') &&
                this.peek() !== '\0'
            ) {
                value += this.advance();
            }

            return {
                type: TokenType.Text,
                value,
                line: startLine,
                column: startColumn,
                line_str: this.lines[startLine - 1]
            };
        }
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];
        let token: Token;

        do {
            try {
                token = this.getNextToken();
                tokens.push(token);
            } catch (error: any) {
                throw error;
            }
        } while (token.type !== TokenType.EOF);

        return tokens;
    }
}

interface ASTVisitor {
    visitProgString?(node: StringProgNode, args?: Record<string, any>): any;
    visitSourceElements?(node: SourceElementsNode, args?: Record<string, any>): any;
    visitText?(node: TextNode, args?: Record<string, any>): any;
    visitPlaceholder?(node: PlaceholderNode, args?: Record<string, any>): any;
}

interface ASTNode {
    type: string;
    token: Token | null;
    accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

abstract class ASTNodeBase implements ASTNode {
    abstract type: string;
    abstract token: Token | null;

    async accept(visitor: ASTVisitor, args?: Record<string, any>) {
        return await this._accept(visitor, args);
    }

    abstract _accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

class StringProgNode extends ASTNodeBase {
    type = 'String';

    constructor(
        public token: Token | null,
        public program: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProgString?.(this, args);
    }
}

class SourceElementsNode extends ASTNodeBase {
    type = 'SourceElements';

    constructor(
        public token: Token | null,
        public sources: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSourceElements?.(this, args);
    }
}

class TextNode extends ASTNodeBase {
    type = 'Text';

    constructor(
        public token: Token | null,
        public value: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitText?.(this, args);
    }
}

class PlaceholderNode extends ASTNodeBase {
    type = 'Placeholder';

    constructor(
        public token: Token | null,
        public field: number | string,
        public width?: number,
        public alignment?: string,
        public data_type?: string,
        public fill?: string,
        public precision?: number,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPlaceholder?.(this, args);
    }
}


/*
<format_string> ::= <text> <placeholder> <text>
<placeholder> ::= "{" (<position> (":" <width> <alignment> <type>)?)? "}"
<alignment> ::= "<" | ">" | "^"
<width> ::= <digit>+
<type> ::= "d" | "f" | "x" | "b"
*/
class Parser {
    private tokens: Token[] = [];
    private current: number = 0;
    private placeholderMode: 'unset' | 'positional' | 'named' | 'auto' = 'unset';
    private autoFieldIndex: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private is_at_end(): boolean {
        return this.peek() == undefined ||
            this.peek().type === TokenType.EOF;
    }

    private advance(): Token {
        if (!this.is_at_end()) this.current++;
        return this.previous();
    }

    private check(type: TokenType): boolean {
        if (this.is_at_end()) return false;
        return this.peek().type === type;
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private error(code: string, reason: string, hint?: string, context?: string, expected?: string[], example?: string): never {
        const token = this.peek();
        throw new TError({
            code,
            reason,
            line: token.line,
            column: token.column,
            lineStr: token.line_str,
            stage: 'stringparser',
            hint,
            context,
            expected,
            example
        });
    }

    /**
     * String ::= (source_elements)? <EOF>
     */
    public parse(): ASTNode {
        let source = this.source_elements();

        if (this.match(TokenType.EOF)) {
            this.error(
                ErrorCodes.string_parser.UNEXPECTED_END_OF_INPUT,
                "Expected 'EOF'"
            );
        }

        return new StringProgNode(this.peek(), source);
    }

    /*
        source_elements ::= (source_element)+
    */
    private source_elements(): ASTNode {
        const sources: ASTNode[] = [];

        while (!this.is_at_end()) {
            sources.push(this.source_element());
        }

        return new SourceElementsNode(this.peek(), sources);
    }

    private source_element(): ASTNode {
        const iden = this.peek().type;

        switch (iden) {
            case TokenType.Text:
                return this.text();
            case TokenType.Placeholder:
                return this.placeholder();
            default:
                break;
        }

        throw new Error();
    }

    private text(): TextNode {
        const token = this.peek();
        if (!this.match(TokenType.Text)) {
            this.error(
                ErrorCodes.string_parser.EXPECTED_TEXT,
                "Expected text.",
            );
        }

        return new TextNode(token, token.value);
    }

    // <position> ":" <width> <alignment> <type>
    private placeholder(): PlaceholderNode {
        const token = this.peek();
        if (!this.match(TokenType.Placeholder)) {
            this.error(
                ErrorCodes.string_parser.EXPECTED_PLACEHOLDER,
                "Expected placeholder.",
            );
        }

        if (!token.parts || token.parts.length === 0 || token.parts[0].value === ':') {
            // Auto-numbered placeholder: `{}` or `{:}` (no field/index/name)
            if (this.placeholderMode === 'unset') {
                this.placeholderMode = 'auto'; // Set mode to 'auto'
            } else if (this.placeholderMode !== 'auto') {
                this.error(
                    "MIXED_PLACEHOLDER_TYPES",
                    "Cannot mix auto-numbered `{}` with named or positional placeholders.",
                    "Use either all `{}` or all `{name}` / `{0}`."
                );
            }

            const field = this.autoFieldIndex++; // Auto-increment for auto-numbering
            let i = 0;
            const parts = token.parts || [];

            // Skip the colon if present, e.g., `{:}`
            if (parts[i] && parts[i].value === ':') {
                i++;
            }

            let fill: string | undefined;
            let align: string | undefined;
            let width: number | undefined;
            let precision: number | undefined;
            let type: string | undefined;

            // Optional fill + align (e.g., "*>" or ">")
            if (parts[i + 1] && /^[<>=^]$/.test(parts[i + 1].value)) {
                fill = parts[i].value;
                align = parts[i + 1].value;
                i += 2;
            } else if (parts[i] && /^[<>=^]$/.test(parts[i].value)) {
                align = parts[i].value;
                i++;
            }

            // Optional width
            if (parts[i] && /^\d+$/.test(parts[i].value)) {
                width = parseInt(parts[i].value, 10);
                i++;
            }

            // Optional precision: "." followed by a number (e.g., `.2f`)
            if (parts[i] && parts[i].value === '.' && parts[i + 1] && /^\d+$/.test(parts[i + 1].value)) {
                precision = parseInt(parts[i + 1].value, 10);
                i += 2;
            }

            // Optional type (e.g., "f" or "s")
            if (parts[i] && /^[a-zA-Z]$/.test(parts[i].value)) {
                type = parts[i].value;
                i++;
            }

            return new PlaceholderNode(token, field, width, align, type, fill, precision);
        } else if (/^\d+$/.test(token.parts[0].value)) {
            // Positional placeholder (e.g., `{0}`)
            if (this.placeholderMode === 'unset') {
                this.placeholderMode = 'positional';
            } else if (this.placeholderMode !== 'positional') {
                this.error(
                    "MIXED_PLACEHOLDER_TYPES",
                    "Cannot mix positional `{0}` with named or auto-numbered placeholders."
                );
            }

            const field = parseInt(token.parts[0].value, 10);
            return new PlaceholderNode(token, field);
        } else if (/^[a-zA-Z_]/.test(token.parts[0].value)) {
            // Named placeholder (e.g., `{name}`)
            if (this.placeholderMode === 'unset') {
                this.placeholderMode = 'named';
            } else if (this.placeholderMode !== 'named') {
                this.error(
                    "MIXED_PLACEHOLDER_TYPES",
                    "Cannot mix named `{name}` with positional or auto-numbered placeholders."
                );
            }

            const field = token.parts[0].value;
            return new PlaceholderNode(token, field);
        } else {
            this.error(
                "INVALID_PLACEHOLDER",
                "Invalid placeholder syntax."
            );
        }
    }
}

class Engine implements ASTVisitor {
    private str: string[] = [];

    constructor(
        public ast: ASTNode,
        public env: Env,
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

    async run() {
        await this.visit(this.ast)

        return this.str.join("");
    }

    async visitProgString(
        node: StringProgNode,
        args?: Record<string, any>
    ) {
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

    async visitText(node: TextNode, args?: Record<string, any>) {
        this.write(node.value);
    }

    // TODO: Can't accept 2 placeholders
    async visitPlaceholder(node: PlaceholderNode, args?: Record<string, any>) {
        let fieldValue: any;

        // Get the field value based on the type of the placeholder (index, name, auto)
        if (typeof node.field === 'number') {
            fieldValue = this.values[node.field];
        } else if (typeof node.field == 'string') {
            fieldValue = this.env.frame.get(node.field);
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

        let formattedValue = await fieldValue.str(this.env, 0);

        if (node.width !== undefined) {
            // Format the value according to width and alignment
            const align = node.alignment || '>'; // Default alignment is right
            formattedValue = fieldValue.toString().padStart(node.width, ' ');
        }

        this.write(formattedValue);
    }
}

let m: Record<string, any> = {
    at(env: Env, value: any[], args: any[]) {
        const index = args[0].getValue()
        if (index >= 0 && index < value.length) {
            return result(env.engine, new StringType(value[index]), null)
        }
        return result(env.engine, null, new StringType(`Index '${index}' is out of bounds.`));
    },
    length(_: Env, value: string) {
        return new NumberNode(null, value.length);
    },
    split(_: Env, value: string, args: Type<string>[]) {
        return new ArrayNode(
            null,
            value.split(args[0].getValue()).map((ch) => new StringNode(null, ch))
        )
    },
    parse(env: Env, value: string, args: any[]) {
        let num = Number(value);
        if (isNaN(num)) {
            return result(env.engine, null, new StringType(`Invalid number`));
        }
        return result(env.engine, new NumberType(num), null)
    },
    async format(env: Env, value: string, args: any[]) {
        const lexer = new Lexer(value);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const engine = new Engine(ast, env, args);
        const res = await engine.run();
        return new StringNode(null, res);
    }
}

export class StringType extends Type<string> {
    constructor(value: string) {
        super("string", value, {
            add: async (env: Env, obj: Type<string>) => new StringType(value + obj.getValue()),
            eq: async (env: Env, obj: Type<string>) => new BoolType(value === obj.getValue()),
            neq: async (env: Env, obj: Type<string>) => await (await this.eq(env, obj)).not(env),
            str: async (env: Env) => `${value}`,
            get: async (env: Env, obj: Type<any>, args: Type<any>[]) => {
                const index = obj.getValue();

                if (obj.type == "string") {

                    if (!(index in m)) {
                        throw new Error(`Method '${index}' doesn't exist for string object.'`)
                    }

                    return new FunctionType(
                        new FunctionDecNode(
                            null,
                            new IdentifierNode(null, index),
                            undefined,
                            new BlockNode(null, [
                                new ReturnNode(
                                    null,
                                    await m[index](env, value, args.map((val) => val))
                                )
                            ])
                        )
                    );
                } else {
                    if (index >= 0 && index < value.length) {
                        return value[index];
                    }
                    throw new Error(`Index ${index} out of bounds`);
                }
            }
        });
    }

    *[Symbol.iterator]() {
        yield this;
    }
}