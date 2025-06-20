import { ErrorCodes, TError } from "../../types";
import { ASTNode, PlaceholderNode, SourceElementsNode, StringProgNode, TextNode } from "./ast";
import { Token, TokenType } from "./lexer";

/*
<format_string> ::= <text> <placeholder> <text>
<placeholder> ::= "{" (<position> (":" <width> <alignment> <type>)?)? "}"
<alignment> ::= "<" | ">" | "^"
<width> ::= <digit>+
<type> ::= "d" | "f" | "x" | "b"
*/
export class Parser {
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
