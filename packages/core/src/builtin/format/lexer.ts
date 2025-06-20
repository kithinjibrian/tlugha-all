import {
    Token as MainToken,
    Lexer as MainLexer,
} from "../../types";

export enum TokenType {
    Placeholder = "Placeholder",
    Text = "Text",
    EOF = 'EOF',
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    line_str: string;
    parts?: MainToken[]
}

export class Lexer {
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