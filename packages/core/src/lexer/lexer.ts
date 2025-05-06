import { TError, ErrorCodes } from "../error/error";
import { TokenType } from "./token";

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    line_str: string;
}

function one_char(c: string) {
    switch (c) {
        case '(':
            return TokenType.LeftParen;
        case ')':
            return TokenType.RightParen;
        case '[':
            return TokenType.LeftBracket;
        case ']':
            return TokenType.RightBracket;
        case ':':
            return TokenType.Colon;
        case ',':
            return TokenType.Comma;
        case ';':
            return TokenType.SemiColon;
        case '+':
            return TokenType.Plus;
        case '-':
            return TokenType.Minus;
        case '*':
            return TokenType.Multiply;
        case '/':
            return TokenType.Divide;
        case '|':
            return TokenType.Pipe;
        case '&':
            return TokenType.Ampersand;
        case '<':
            return TokenType.LT;
        case '>':
            return TokenType.GT;
        case '=':
            return TokenType.Equals;
        case '.':
            return TokenType.Dot;
        case '%':
            return TokenType.Modulo;
        case '{':
            return TokenType.LeftBrace;
        case '}':
            return TokenType.RightBrace;
        case '^':
            return TokenType.Caret;
        case '~':
            return TokenType.Xor;
        case '$':
            return TokenType.Dollar;
        case '#':
            return TokenType.Hash;
        case '\n':
            return TokenType.Newline;
        default:
            return TokenType.OP;
    }
}

function two_char(c1: string, c2: string) {
    switch (c1) {
        case '=':
            switch (c2) {
                case '=':
                    return TokenType.IsEqual;
            }
            break;
        case ':':
            switch (c2) {
                case ':':
                    return TokenType.Scope;
            }
            break;
        case '!':
            switch (c2) {
                case '=':
                    return TokenType.IsNotEqual;
            }
            break;
        case '<':
            switch (c2) {
                case '=':
                    return TokenType.LTE;
                case '<':
                    return TokenType.SL;
            }
            break;
        case '>':
            switch (c2) {
                case '=':
                    return TokenType.GTE;
                // case '>':
                //     return TokenType.SR;
            }
            break;
        case '+':
            switch (c2) {
                case '=':
                    return TokenType.PlusEquals;
            }
            break;
        case '-':
            switch (c2) {
                case '=':
                    return TokenType.MinusEquals;
                case '>':
                    return TokenType.Arrow;
            }
            break;
        case '*':
            switch (c2) {
                case '=':
                    return TokenType.MultiplyEquals;
            }
            break;
        case '/':
            switch (c2) {
                case '=':
                    return TokenType.DivideEquals;
            }
            break;
        case '|':
            switch (c2) {
                case '=':
                    return TokenType.OrEquals;
                case '|':
                    return TokenType.Or;
            }
            break;
        case '%':
            switch (c2) {
                case '=':
                    return TokenType.ModuloEquals;
            }
            break;
        case '&':
            switch (c2) {
                case '=':
                    return TokenType.AndEquals;
                case '&':
                    return TokenType.And
            }
            break;
        case '^':
            switch (c2) {
                case '=':
                    return TokenType.XorEquals;
            }
            break;
        default:
            return TokenType.OP
    }

    return TokenType.OP;
}

function three_char(c1: string, c2: string, c3: string) {
    switch (c1) {
        case '<':
            switch (c2) {
                case '<':
                    switch (c3) {
                        case '=':
                            return TokenType.SlEquals;
                    }
                    break;
            }
            break;
        case '>':
            switch (c2) {
                case '>':
                    switch (c3) {
                        case '=':
                            return TokenType.SREquals;
                    }
                    break;
            }
            break;
        case '.':
            switch (c2) {
                case '.':
                    switch (c3) {
                        case '.':
                            return TokenType.Ellipsis;
                    }
                    break;
            }
            break;
        default:
            return TokenType.OP;
    }

    return TokenType.OP;
}

export class Lexer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
    private lines: string[] = [];

    constructor(input: string) {
        this.input = input;
        this.lines = input.split('\n');
    }

    private error(code: string, reason: string, hint?: string, context?: string, expected?: string[]): never {
        throw new TError({
            code,
            reason,
            line: this.line,
            column: this.column,
            lineStr: this.getCurrentLine(),
            stage: 'lexer',
            hint,
            context,
            expected
        });
    }

    private peek(offset: number = 0): string {
        return this.position + offset < this.input.length ? this.input[this.position + offset] : '\0';
    }

    private advance(): string {
        const char = this.peek();
        this.position++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    private getCurrentLine(): string {
        return this.lines[this.line - 1] || '';
    }

    private skipWhitespace(): void {
        while (/\s/.test(this.peek())) {
            this.advance();
        }
    }

    private skipComment(): void {
        if (this.peek() === '/') {
            const nextChar = this.peek(1);
            if (nextChar === '/') {
                while (
                    this.peek() !== '\n' &&
                    this.peek() !== '\0'
                ) {
                    this.advance();
                }
            } else if (nextChar === '*') {
                this.advance();
                this.advance();
                while (!(this.peek() === '*' && this.peek(1) === '/') && this.peek() !== '\0') {
                    this.advance();
                }
                this.advance();
                this.advance();
            }
        }
    }

    private readNumber(): Token {
        const startColumn = this.column;
        const currentLineStr = this.getCurrentLine();
        let value = '';

        while (/\d/.test(this.peek())) {
            value += this.advance();
        }

        if (this.peek() === '.') {
            value += this.advance();
            while (/\d/.test(this.peek())) {
                value += this.advance();
            }
        }

        return { type: TokenType.Number, value, line: this.line, column: startColumn, line_str: currentLineStr };
    }

    private readIdentifier(): Token {
        const startColumn = this.column;
        const currentLineStr = this.getCurrentLine();
        let value = '';

        while (/[a-zA-Z0-9_]/.test(this.peek())) {
            value += this.advance();
        }

        const keywords = new Map<string, TokenType>([
            ["continue", TokenType.Continue],
            ["return", TokenType.Return],
            ["break", TokenType.Break],
            ["while", TokenType.While],
            ["for", TokenType.For],
            ["do", TokenType.Do],
            ["if", TokenType.If],
            ["else", TokenType.Else],
            ["switch", TokenType.Switch],
            ["case", TokenType.Case],
            ["default", TokenType.Default],
            ["let", TokenType.Let],
            ["const", TokenType.Const],
            ["fun", TokenType.Fun],
            ["struct", TokenType.Struct],
            ["export", TokenType.Export],
            ["import", TokenType.Import],
            ["module", TokenType.Module],
            ["true", TokenType.True],
            ["false", TokenType.False],
            ["extends", TokenType.Extends],
            ["async", TokenType.Async],
            ["await", TokenType.Await],
            ["enum", TokenType.Enum],
            ["mut", TokenType.Mut],
            ["impl", TokenType.Impl],
            ["use", TokenType.Use],
            ["as", TokenType.As],
            ["type", TokenType.Type],
        ]);

        return {
            type: keywords.get(value) || TokenType.Identifier,
            value,
            line: this.line,
            column: startColumn,
            line_str: currentLineStr
        };
    }

    private readString(): Token {
        const startColumn = this.column;
        const startLine = this.line;
        const currentLineStr = this.getCurrentLine();
        const quote = this.peek();
        let value = '';

        // Peek ahead to check for triple double-quotes
        if (quote === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
            value = this.readMultiLineString();
        } else if (quote === '"' || quote === "'") {
            value = this.readSingleLineString();
        } else {
            this.error(
                ErrorCodes.lexer.UNEXPECTED_QUOTE,
                "Unexpected quote type",
                `Strings in lugha must be enclosed using one of the following styles:

  1. Double or single quotes for single-line strings:
     let str = "lugha";
              let str = 'lugha';

  2. Triple double-quotes for multi-line strings:
     let mstr = """
         This is a multiline
         string in lugha
     """;
  `
            );
        }

        return {
            type: TokenType.String,
            value,
            line: startLine,
            column: startColumn,
            line_str: currentLineStr
        };
    }

    // Function to handle single-line strings (enclosed in " or ')
    private readSingleLineString(): string {
        let value = '';
        const quote = this.peek();
        this.advance(); // Skip opening quote

        while (this.peek() !== quote && this.peek() !== '\0') {
            const ch = this.peek();

            // Disallow unescaped newlines
            if (ch === '\n' || ch === '\r') {
                this.error(
                    ErrorCodes.lexer.UNTERMINATED_STRING,
                    "Unexpected newline in single-line string",
                    "Use triple double quotes (\"\"\" \"\"\") for multi-line strings.",
                    `String value: '${value}'`
                );
            }

            if (ch === '\\') {
                this.advance();
                const escapeChar = this.advance();
                const escapeSequences: { [key: string]: string } = {
                    'n': '\n', 't': '\t', '\\': '\\', '"': '"', "'": "'"
                };
                value += escapeSequences[escapeChar] || escapeChar;
            } else {
                value += this.advance();
            }
        }

        if (this.peek() === '\0') {
            this.error(
                ErrorCodes.lexer.UNTERMINATED_STRING,
                "Unterminated string literal.",
                "Ensure that the string is properly closed with matching quotes.",
                `String value: '${value}'`,
                ["Closing quote"]
            );
        }

        this.advance(); // Skip closing quote
        return value;
    }

    // Function to handle multi-line strings (enclosed in triple double quotes)
    private readMultiLineString(): string {
        let value = '';
        this.advance(); // Skip first "
        this.advance(); // Skip second "
        this.advance(); // Skip third "

        while (!(this.peek() === '"' && this.peek(1) === '"' && this.peek(2) === '"') && this.peek() !== '\0') {
            if (this.peek() === '\\') {
                this.advance();
                const escapeChar = this.advance();
                const escapeSequences: { [key: string]: string } = {
                    'n': '\n', 't': '\t', '\\': '\\', '"': '"', "'": "'"
                };
                value += escapeSequences[escapeChar] || escapeChar;
            } else {
                value += this.advance();
            }
        }

        if (this.peek() === '\0') {
            this.error(
                ErrorCodes.lexer.UNTERMINATED_STRING,
                "Unterminated string literal.",
                "Ensure that the string is properly closed with matching triple quotes.",
                `String value: """${value}"""`,
                ["Triple closing quotes"]
            );
        }

        this.advance(); // Skip first closing "
        this.advance(); // Skip second closing "
        this.advance(); // Skip third closing "
        return value;
    }

    private readOperator(): Token {
        const startColumn = this.column;
        const currentLineStr = this.getCurrentLine();

        const c1 = this.peek();
        const c2 = this.peek(1);
        const c3 = this.peek(2);

        // Try three-character operators
        const threeCharOp = three_char(c1, c2, c3);
        if (threeCharOp !== TokenType.OP) {
            this.advance(); // First char
            this.advance(); // Second char
            this.advance(); // Third char
            return { type: threeCharOp, value: c1 + c2 + c3, line: this.line, column: startColumn, line_str: currentLineStr };
        }

        // Try two-character operators
        const twoCharOp = two_char(c1, c2);
        if (twoCharOp !== TokenType.OP) {
            this.advance(); // First char
            this.advance(); // Second char
            return { type: twoCharOp, value: c1 + c2, line: this.line, column: startColumn, line_str: currentLineStr };
        }

        // Single-character operators
        const oneCharOp = one_char(c1);
        if (oneCharOp !== TokenType.OP) {
            this.advance();
            return { type: oneCharOp, value: c1, line: this.line, column: startColumn, line_str: currentLineStr };
        }

        this.error(
            ErrorCodes.lexer.ILLEGAL_CHARACTER,
            `Invalid operator`
        );
    }

    public getNextToken(): Token {
        this.skipWhitespace();
        this.skipComment();

        if (this.position >= this.input.length) {
            return { type: TokenType.EOF, value: '', line: this.line, column: this.column, line_str: "" };
        }

        const char = this.peek();

        if (/\d/.test(char)) return this.readNumber();
        if (/[a-zA-Z_]/.test(char)) return this.readIdentifier();
        if (char === '"' || char === "'") {
            try {
                return this.readString();
            } catch (error: any) {
                throw error
            }
        }

        try {
            return this.readOperator();
        } catch (error: any) {
            throw error
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
