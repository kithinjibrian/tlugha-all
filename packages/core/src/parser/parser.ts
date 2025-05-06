import {
    ArrayNode,
    AssignmentExpressionNode,
    ASTNode,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    CallExpressionNode,
    EnumNode,
    EnumVariantNode,
    EnumVariantValueNode,
    ExpressionNode,
    ExpressionStatementNode,
    FieldNode,
    FunctionDecNode,
    IdentifierNode,
    IfElseNode,
    ImportNode,
    MapNode,
    MemberExpressionNode,
    ModuleNode,
    NumberNode,
    ParameterNode,
    ParametersListNode,
    ProgramNode,
    PropertyNode,
    ReturnNode,
    ScopedIdentifierNode,
    SetNode,
    SourceElementsNode,
    StringNode,
    StructInitNode,
    StructFieldNode,
    StructNode,
    StructVariantNode,
    TupleNode,
    TupleVariantNode,
    TypeNode,
    TypeParameterNode,
    UseItemNode,
    UseListNode,
    UseNode,
    UsePathNode,
    VariableNode,
    VariableStatementNode,
    WhileNode,
    MemberDecNode,
    LambdaNode,
    AliasNode,
} from "./ast";

import { Token } from "../lexer/lexer";
import { TokenType } from "../lexer/token";
import { ErrorCodes, TError } from "../error/error";

export class Parser {
    private tokens: Token[] = [];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens.filter(token => token.type !== TokenType.Newline);
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
            stage: 'parser',
            hint,
            context,
            expected,
            example
        });
    }

    /**
     * Program ::= (source_elements)? <EOF>
     */
    public parse(): ASTNode {
        let source = this.source_elements();

        if (this.match(TokenType.EOF)) {
            this.error(
                ErrorCodes.parser.UNEXPECTED_END_OF_INPUT,
                "Expected 'EOF'"
            );
        }

        return new ProgramNode(this.peek(), source);
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

    /*
        source_element ::= statement
    */
    private source_element(): ASTNode {
        return this.statement();
    }

    /**
     statement ::= block
        | variable_statement
        | import_statement
        | use_statement
        | empty_statement
        | if_statement
        | iteration_statement
        | continue_statement
        | break_statement
        | return_statement
        | expression_statement
        | struct_statement
        | enum_statement
        | trait_statement
        | module_statement
     */
    private statement(): ASTNode {
        const iden = this.peek().type;

        switch (iden) {
            case TokenType.Fun:
                return this.function_declaration();
            case TokenType.While:
                return this.while_statement();
            case TokenType.For:
            // return this.for_statement();
            case TokenType.Return:
                return this.return_statement();
            case TokenType.Break:
                return this.break_statement();
            case TokenType.Continue:
                return this.continue_statement();
            case TokenType.LeftBrace:
                return this.block();
            case TokenType.If:
                return this.if_statement();
            case TokenType.Struct:
                return this.struct_statement();
            case TokenType.Enum:
                return this.enum_statement();
            case TokenType.Module:
                return this.module_statement();
            case TokenType.Import:
                return this.import();
            case TokenType.Use:
                return this.use();
            case TokenType.Type:
                return this.alias();
            case TokenType.Const:
            case TokenType.Let:
                {
                    const node = this.variable_statement();
                    if (!this.match(TokenType.SemiColon)) {
                        this.error(
                            ErrorCodes.parser.MISSING_SEMICOLON, // Error code for syntax errors
                            "Expected ';' at the end of the statement.",
                            "Ensure that you are terminating your statements with a semicolon.",
                            `Found token: '${this.peek().value}' instead of a semicolon`,
                            ["';'"]
                        );
                    }

                    return node;
                }
        }

        return this.expression_statement();
    }

    // function_declaration ::= "fun" identifier (type_parameters)? "(" (parameter_list)? ")" type_annotation function_body
    private function_declaration(): FunctionDecNode {
        // Expect function keyword ('fun')
        if (!this.match(TokenType.Fun)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected 'fun' keyword to define a function.",
                "Ensure you're starting the function declaration with the 'fun' keyword.",
                `Found token: '${this.peek().value}' instead of 'fun'.`,
                ["'fun'"],
                "'fun my_function() { ... }'"
            );
        }

        const fun_token = this.peek();

        const functionName = this.identifier();
        let tp: TypeParameterNode[] | undefined = undefined;

        // Check for type parameters (generic functions)
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            // Expect closing '>'
            if (!this.match(TokenType.GT)) {
                this.error(
                    ErrorCodes.parser.MISSING_GREATER_THAN,
                    "Expected '>' after type parameters.",
                    "Ensure that you close your type parameters with a closing '>' token.",
                    `Found token: '${this.peek().value}' instead of '>'`,
                    [">"],
                    "'fun my_function<T>(param T) { ... }'"
                );
            }
        }

        // Expect opening parenthesis after function name
        if (!this.match(TokenType.LeftParen)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected '(' after function name.",
                "Ensure the function declaration is followed by '(' to start the parameter list.",
                `Found token: '${this.peek().value}' instead of '('`,
                ["'('"],
                "'fun my_function(param1: number, param2: string) { ... }'"
            );
        }

        // Parse the function parameters
        let parameters = this.parameters_list();

        // Expect closing parenthesis after parameters
        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after parameters.",
                "Ensure the function declaration is followed by ')' to close the parameter list.",
                `Found token: '${this.peek().value}' instead of ')'`,
                [")"],
                "'fun my_function(param1: number, param2: string) { ... }'"
            );
        }

        let rt: ASTNode;

        // Check if return type is specified
        if (this.match(TokenType.Colon)) {
            rt = this.type();
        } else {
            this.error(
                ErrorCodes.parser.MISSING_RETURN_TYPE,
                `Function '${functionName.name}' requires a return type annotation.`,
                "Ensure the function is followed by a return type after a colon ':' if needed.",
                `Found token: '${this.peek().value}' instead of a return type.`,
                [":"],
                "'fun my_function(): number { ... }'"
            );
        }

        // Expect function body (block)
        let body = this.block();
        body.name = `fn_body_${functionName.name}`;

        return new FunctionDecNode(
            fun_token,
            functionName,
            parameters,
            body,
            false,
            false,
            false,
            tp,
            rt
        );
    }

    private lambda_function(): LambdaNode {
        // Expect function keyword ('fun') for lambda function
        if (!this.match(TokenType.Fun)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected 'fun' keyword to define a lambda function.",
                "Ensure you're starting the lambda function declaration with the 'fun' keyword.",
                `Found token: '${this.peek().value}' instead of 'fun'.`,
                ["'fun'"],
                "'fun (x: number, y: number) -> x + y'"
            );
        }

        const fun_token = this.peek();

        let tp: TypeParameterNode[] | undefined = undefined;

        // Check for type parameters (generic lambdas)
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            // Expect closing '>'
            if (!this.match(TokenType.GT)) {
                this.error(
                    ErrorCodes.parser.MISSING_GREATER_THAN,
                    "Expected '>' after type parameters.",
                    "Ensure that you close your type parameters with a closing '>' token.",
                    `Found token: '${this.peek().value}' instead of '>'`,
                    [">"],
                    "'fun <T>(x: T) -> x'"
                );
            }
        }

        // Expect opening parenthesis for lambda function parameters
        if (!this.match(TokenType.LeftParen)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected '(' after function name.",
                "Ensure the lambda function is followed by '(' to start the parameter list.",
                `Found token: '${this.peek().value}' instead of '('`,
                ["'('"],
                "'fun (x: number, y: number) -> x + y'"
            );
        }

        // Parse the lambda function parameters
        let parameters = this.parameters_list();

        // Expect closing parenthesis after parameters
        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after parameters.",
                "Ensure the lambda function declaration is followed by ')' to close the parameter list.",
                `Found token: '${this.peek().value}' instead of ')'`,
                [")"],
                "'fun (x: number, y: number) -> x + y'"
            );
        }

        let rt: ASTNode | undefined = undefined;

        // Check if return type is specified (optional in some cases)
        if (this.match(TokenType.Colon)) {
            rt = this.type();
        }

        let body;

        // Expect the arrow (->) for the lambda body
        if (this.match(TokenType.Arrow)) {
            // Check if body is a block or an expression
            if (this.check(TokenType.LeftBrace)) {
                body = this.block();
            } else {
                body = this.expression();
            }
        } else {
            this.error(
                ErrorCodes.parser.MISSING_ARROW,
                "Expected token '->' for lambda functions.",
                "Ensure you're using the '->' arrow token to separate parameters from the body in a lambda function.",
                `Found token: '${this.peek().value}' instead of '->'`,
                ["'->'"],
                "'fun (x: number, y: number) -> x + y'"
            );
        }

        // Return a new LambdaNode with the parsed parameters, body, and optional type parameters and return type
        return new LambdaNode(
            fun_token,
            parameters,
            body,
            false,
            tp,
            rt
        );
    }

    private parameters_list(): ParametersListNode | undefined {
        // If the next token is a right parenthesis, this means no parameters are provided.
        if (this.peek().type === TokenType.RightParen) {
            return undefined;
        }

        let seen_variadic = false;
        const parameters = [];

        // Loop through the parameters list and check for variadic
        do {
            // Check if variadic parameter is already seen. If so, throw an error.
            if (seen_variadic) {
                this.error(
                    ErrorCodes.parser.VARIADIC_PARAMETER_ERROR,
                    "Variadic parameter should be the last parameter in a function.",
                    "Variadic parameters are denoted by '...' and must always be the last parameter in the function.",
                    `Found token: '${this.peek().value}' after variadic parameter.`,
                    ["'...'"],
                    "'fun sum(a: number, b: number, ...rest: (number)) { ... }'"
                );
            }

            // Parse the current parameter
            const n = this.parameter();

            // Check if the current parameter is variadic
            if (n.variadic) {
                seen_variadic = true;
            }

            parameters.push(n);
        } while (this.match(TokenType.Comma)); // Continue parsing if we encounter a comma

        // Return the parameters as a list node
        return new ParametersListNode(this.peek(), parameters);
    }

    private parameter(): ParameterNode {
        let variadic = false;

        // Check for ellipsis token (variadic parameter)
        if (this.match(TokenType.Ellipsis)) {
            variadic = true;
        }

        // Parse the identifier (parameter name)
        const identifier = this.identifier();

        // Check for the colon token (parameter type annotation)
        if (!this.match(TokenType.Colon)) {
            this.error(
                ErrorCodes.parser.MISSING_TYPE_ANNOTATION,
                `Parameter '${identifier.name}' requires type annotation.`,
                `A type annotation is required after the parameter name, indicating its type.`,
                `Found token: '${this.peek().value}' instead of a colon ':'`,
                [":"],
                "'param: number'"
            );
        }

        // Parse the parameter's data type
        const data_type = this.type();

        // Return the parsed parameter as a ParameterNode
        return new ParameterNode(
            this.peek(),
            identifier,
            variadic,
            data_type
        );
    }

    // "while" "(" expression ")" statement
    private while_statement(): WhileNode {
        // Check for the 'while' keyword
        if (!this.match(TokenType.While)) {
            this.error(
                ErrorCodes.parser.MISSING_WHILE_KEYWORD,
                "Expected keyword 'while' to start a while loop.",
                "Ensure you're starting the loop with the 'while' keyword.",
                `Found token: '${this.peek().value}' instead of 'while'.`,
                ["'while'"],
                "'while (condition) { ... }'"
            );
        }

        // Expect opening parenthesis
        if (!this.match(TokenType.LeftParen)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected '(' before the expression in the while loop.",
                "Ensure the expression inside the while loop is enclosed in parentheses.",
                `Found token: '${this.peek().value}' instead of '('`,
                ["'('"],
                "'while (condition) { ... }'"
            );
        }

        // Parse the loop expression
        let expression = this.expression();

        // Expect closing parenthesis
        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after the expression in the while loop.",
                "Ensure the expression is closed with a ')' after the condition.",
                `Found token: '${this.peek().value}' instead of ')'`,
                [")"],
                "'while (condition) { ... }'"
            );
        }

        // Parse the body of the while loop
        const body = this.statement();

        // If the body is a block, name it "While"
        if (body instanceof BlockNode) {
            body.name = "While";
        }

        // Return the constructed WhileNode
        return new WhileNode(this.peek(), expression, body);
    }

    /*  
        block ::= { statement_list }
        statement_list ::= statement+
    */
    private block(): BlockNode {
        const body: ASTNode[] = [];

        // Expect opening brace
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to start the block body.",
                "Ensure the block is enclosed within curly braces '{ }'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["'{'"],
                "'{ statement1; statement2; }'"
            );
        }

        // Parse statements inside the block
        while (!this.check(TokenType.RightBrace) && !this.is_at_end()) {
            body.push(this.statement());
        }

        // Expect closing brace
        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close the block body.",
                "Ensure the block ends with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["'}'"],
                "'{ statement1; statement2; }'"
            );
        }

        return new BlockNode(this.peek(), body);
    }

    private return_statement(): ReturnNode {
        // Expect the 'return' keyword
        if (!this.match(TokenType.Return)) {
            this.error(
                ErrorCodes.parser.MISSING_RETURN_KEYWORD,
                "Expected 'return' keyword to start the return statement.",
                "Ensure that the return statement begins with the 'return' keyword.",
                `Found token: '${this.peek().value}' instead of 'return'.`,
                ["'return'"],
                "'return value;'"
            );
        }

        // Check for an empty return statement (just a return with no value)
        if (this.match(TokenType.SemiColon)) {
            return new ReturnNode(this.peek());
        }

        // Parse the expression after 'return'
        const expression = this.expression();

        // Expect semicolon after return statement
        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after return statement.",
                "Ensure the return statement ends with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'.`,
                ["';'"],
                "'return value;'"
            );
        }

        return new ReturnNode(this.peek(), expression);
    }

    private break_statement(): ASTNode {
        if (!this.match(TokenType.Break)) {
            this.error(
                ErrorCodes.parser.MISSING_BREAK_KEYWORD,
                "Expected 'break' keyword.",
                "Use 'break' to exit from a loop or switch statement.",
                `Found token: '${this.peek().value}' instead of 'break'.`,
                ["'break'"],
                "'break;'"
            );
        }

        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after 'break'.",
                "Statements must end with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'.`,
                ["';'"],
                "'break;'"
            );
        }

        return {
            type: "Break",
            token: this.peek(),
            accept(visitor) {
                return visitor.visitBreak?.(this);
            }
        };
    }

    private continue_statement(): ASTNode {
        if (!this.match(TokenType.Continue)) {
            this.error(
                ErrorCodes.parser.MISSING_CONTINUE_KEYWORD,
                "Expected 'continue' keyword.",
                "Use 'continue' to skip the rest of the current loop iteration.",
                `Found token: '${this.peek().value}' instead of 'continue'.`,
                ["'continue'"],
                "'continue;'"
            );
        }

        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after 'continue'.",
                "Statements must end with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'.`,
                ["';'"],
                "'continue;'"
            );
        }

        return {
            type: "Continue",
            token: this.peek(),
            accept(visitor) {
                return visitor.visitContinue?.(this);
            }
        };
    }

    // "if" "(" expression ")" statement ("else" statement)?
    private if_statement(): IfElseNode {
        if (!this.match(TokenType.If)) {
            this.error(
                ErrorCodes.parser.MISSING_IF_KEYWORD,
                "Expected 'if' keyword to start a conditional statement.",
                "The 'if' statement must start with the keyword 'if'.",
                `Found token: '${this.peek().value}' instead of 'if'.`,
                ["'if'"],
                "'if (condition) { ... }'"
            );
        }

        if (!this.match(TokenType.LeftParen)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected '(' after 'if'.",
                "The condition of an 'if' statement must be enclosed in parentheses.",
                `Found token: '${this.peek().value}' instead of '('.`,
                ["'('"],
                "'if (x > 0) { ... }'"
            );
        }

        let condition = this.expression();

        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after the condition in 'if' statement.",
                "You must close the condition expression with a right parenthesis ')'.",
                `Found token: '${this.peek().value}' instead of ')'.`,
                [")"],
                "'if (x > 0) { ... }'"
            );
        }

        const consequent = this.statement();

        if (this.match(TokenType.Else)) {
            const alternate = this.statement();
            return new IfElseNode(this.peek(), condition, consequent, alternate);
        }

        return new IfElseNode(this.peek(), condition, consequent);
    }

    // variable_statement ::= "let" variable_declaration ";"
    // | "const" variable_declaration ";"
    private variable_statement(): VariableStatementNode {
        let constant = false;

        if (!this.match(TokenType.Let)) {
            if (this.match(TokenType.Const)) {
                constant = true;
            } else {
                this.error(
                    ErrorCodes.parser.MISSING_LET_OR_CONST,
                    "Expected 'let' or 'const' to declare a variable.",
                    "All variable declarations must begin with either 'let' (for mutable) or 'const' (for immutable).",
                    `Found token: '${this.peek().value}' instead.`,
                    ["'let'", "'const'"],
                    "- let x = 5;\n  - const PI = 3.14;"
                );
            }
        }

        return new VariableStatementNode(this.peek(), this.variable(constant));
    }

    // variable_declaration ::= ("mut")? identifier (type_annotation)? (initialiser)?
    private variable(constant: boolean = false): VariableNode {
        let mutable = false;
        let expression = undefined;

        if (this.match(TokenType.Mut)) {
            if (constant) {
                this.error(
                    ErrorCodes.parser.INVALID_MUT_CONST_COMBO,
                    "Cannot use 'mut' with a constant variable.",
                    "Variables declared with 'const' cannot be marked mutable.",
                    `Tried to declare a constant mutable variable: 'const mut ${this.peek().value}'`,
                    ["Remove 'mut' or use 'let' instead of 'const'"],
                    "- const x: number = 5; // valid\n  - let mut x: number = 5; // valid\n  - const mut x: number = 5; // ❌ invalid"
                );
            }
            mutable = true;
        }

        let identifier = this.identifier();

        const data_type = this.type_annotation();

        if (this.match(TokenType.Equals)) {
            expression = this.assignment_expression();
        }

        return new VariableNode(
            this.peek(),
            identifier,
            constant,
            mutable,
            expression,
            undefined,
            data_type
        );
    }

    // scoped_identifier ::= identifier  ("::" identifier)*
    private scoped_identifier(): ScopedIdentifierNode {
        if (!this.match(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_IDENTIFIER,
                "Expected an identifier at the beginning of scoped identifier.",
                "Scoped identifiers should begin with a valid identifier.",
                `Found token: '${this.peek().value}' instead.`,
                ["<identifier>"],
                "'foo::bar::baz'"
            );
        }

        const names = [this.previous().value];

        while (this.match(TokenType.Scope)) {
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_IDENTIFIER,
                    "Expected an identifier after scope resolution operator '::'.",
                    "Each segment in a scoped identifier must be a valid identifier.",
                    `Found token: '${this.peek().value}' instead.`,
                    ["<identifier>"],
                    "'foo::bar'"
                );
            }
            names.push(this.previous().value);
        }

        return new ScopedIdentifierNode(this.peek(), names);
    }

    private identifier(): IdentifierNode {
        if (!this.match(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_IDENTIFIER,
                "Expected an identifier.",
                "Identifiers are required here, such as variable or function names.",
                `Found token: '${this.peek().value}' instead.`,
                ["<identifier>"],
                "'let count = 0;' — 'count' is the identifier."
            );
        }

        const name = this.previous().value;
        return new IdentifierNode(this.peek(), name);
    }

    private alias(): AliasNode {
        if (!this.match(TokenType.Type)) {
            this.error(
                ErrorCodes.parser.EXPECTED_TYPE_KEYWORD,
                "Expected 'type' keyword to start a type alias.",
                "Type aliases must begin with the keyword 'type'.",
                `Found token: '${this.peek().value}' instead.`,
                ["'type'"],
                "'type kilometer = number;'"
            );
        }

        const identifier = this.identifier();

        if (!this.match(TokenType.Equals)) {
            this.error(
                ErrorCodes.parser.EXPECTED_EQUAL_SIGN,
                "Expected '=' after type alias name.",
                "Type aliases require '=' to assign the aliased type.",
                `Found token: '${this.peek().value}' instead.`,
                ["'='"],
                "'type UserId = string;'"
            );
        }

        const data_type = this.type();

        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after type alias declaration.",
                "Type aliases must end with a semicolon ';'.",
                `Found token: '${this.peek().value}' instead.`,
                ["';'"],
                "'type Status = 'open';'"
            );
        }

        return new AliasNode(this.peek(), identifier, data_type);
    }

    /**
        type_parameters ::= "<" type_parameter ("," type_parameter)* ">"
        type_parameter ::= identifier (":" identifier ("," identifier)*)?
     */
    private type_parameters(): TypeParameterNode[] {
        const params: TypeParameterNode[] = [];

        do {
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_TYPE_PARAMETER_NAME,
                    "Expected type parameter name.",
                    "Each type parameter must start with an identifier.",
                    `Found token: '${this.peek().value}' instead.`,
                    ["<identifier>"],
                    "'fun generic<T>() {}'"
                );
            }

            const name = this.previous().value;
            let constraints: string[] = [];

            if (this.match(TokenType.Colon)) {
                do {
                    if (!this.match(TokenType.Identifier)) {
                        this.error(
                            ErrorCodes.parser.EXPECTED_CONSTRAINT_IDENTIFIER,
                            "Expected identifier for trait/interface constraint.",
                            "Constraints in type parameters must be identifiers.",
                            `Found token: '${this.peek().value}' instead.`,
                            ["<identifier>"],
                            "'T: Display + Clone'"
                        );
                    }
                    constraints.push(this.previous().value);
                } while (this.match(TokenType.Plus));
            }

            params.push(new TypeParameterNode(this.peek(), name, constraints));
        } while (this.match(TokenType.Comma));

        return params;
    }

    // type_annotation ::= ":" type
    private type_annotation(): ASTNode | undefined {
        if (!this.match(TokenType.Colon)) {
            return undefined;
        }

        return this.type();
    }

    /**
     * 
    type ::= Type
        | Type < type ("," type)* >
        | "(" type ("," type)* ")"
     */
    public type(): ASTNode {
        let type: ASTNode | null = null;

        if ((type = this.ft_type())) {
            return type;
        } else if ((type = this.other_type())) {
            return type;
        }

        return {
            type: "",
            token: this.peek(),
            accept() { }
        };
    }

    private ft_type(): ASTNode | null {
        if (!this.match(TokenType.LeftParen)) {
            return null; // Not a function type; let caller handle
        }

        let type = "tuple";
        const types: ASTNode[] = [];

        if (!this.check(TokenType.RightParen)) {
            types.push(this.type());

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.RightParen)) break; // Allow trailing comma
                types.push(this.type());
            }
        }

        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' to close type tuple or parameter list.",
                "Function types must close the type list with a parenthesis.",
                `Found token: '${this.peek().value}' instead of ')'`,
                ["')'"],
                "'(number, string)' or '(T): unit'"
            );
        }

        if (this.match(TokenType.Arrow)) {
            type = "->";
            types.push(this.type());
        }

        return new TypeNode(this.peek(), type, types);
    }

    // Type "<" type ">"
    private other_type(): ASTNode | null {
        if (!this.match(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_IDENTIFIER,
                "Expected a type identifier.",
                "A type must start with a valid identifier like 'Array' or 'Map'.",
                `Found token: '${this.peek().value}' instead of an identifier.`,
                ["identifier"],
                "'Array<number>' or 'Result<T, E>'"
            );
        }

        const value = this.previous().value;

        // If not a generic, return as plain type
        if (!this.match(TokenType.LT)) {
            return new TypeNode(this.peek(), value);
        }

        const types: ASTNode[] = [];

        if (!this.check(TokenType.GT)) {
            types.push(this.type());

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.GT)) break; // Allow trailing comma
                types.push(this.type());
            }
        }

        if (!this.match(TokenType.GT)) {
            this.error(
                ErrorCodes.parser.MISSING_GREATER_THAN,
                `Expected closing '>' for generic type '${value}'.`,
                "Make sure all type parameters are closed with '>'.",
                `Found token: '${this.peek().value}' instead of '>'`,
                [">"],
                "'List<number>' or 'Map<string, number>'"
            );
        }

        return new TypeNode(this.peek(), value, types);
    }

    // expression_statement::= expression ";"
    private expression_statement(): ExpressionStatementNode {
        const expression = this.expression();

        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after expression.",
                "All expressions used as standalone statements must be terminated with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'.`,
                ["';'"],
                "'do_something();'"
            );
        }

        return new ExpressionStatementNode(this.peek(), expression);
    }

    // expression ::= assignment_expression ("," assignment_expression)*
    private expression(): ASTNode {
        const expr = this.assignment_expression();

        if (this.match(TokenType.Comma)) {
            const expressions = [expr];

            do {
                expressions.push(this.assignment_expression());
            } while (this.match(TokenType.Comma));

            return new ExpressionNode(this.peek(), expressions);
        }

        return expr;
    }

    /**
    assignment_expression ::= conditional_expression
        | unary_expression assignment_operator assignment_expression
     */
    private assignment_expression(): ASTNode {
        const left = this.conditional_expression();

        if (this.is_assignment_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.assignment_expression();

            if (!this.is_valid_assignment_target(left)) {
                this.error(
                    ErrorCodes.parser.INVALID_ASSIGNMENT_TARGET,
                    "Invalid assignment target.",
                    "Assignments must be made to a valid identifier, property, or index expression.",
                    `Cannot assign to expression of type '${left.type}'.`,
                    ["identifier", "property access", "index access"],
                    "'x = 42;' or 'obj.prop = value;'"
                );
            }

            return new AssignmentExpressionNode(this.peek(), operator, left, right);
        }

        return left;
    }

    private is_assignment_operator(type: TokenType): boolean {
        return type === TokenType.Equals ||
            type === TokenType.PlusEquals ||
            type === TokenType.MinusEquals ||
            type === TokenType.MultiplyEquals ||
            type === TokenType.DivideEquals ||
            type === TokenType.ModuloEquals ||
            type === TokenType.SREquals ||
            type === TokenType.SlEquals ||
            type === TokenType.AndEquals ||
            type === TokenType.XorEquals ||
            type === TokenType.OrEquals
    }

    private is_valid_assignment_target(node: ASTNode): boolean {
        switch (node.type) {
            case 'Identifier':
                return true;
            case 'ScopedIdentifier':
                return true;
            case 'MemberExpression':
                return true;
            default:
                return false;
        }
    }

    private conditional_expression(): ASTNode {
        const condition = this.logical_or_expression();

        if (this.match(TokenType.QuestionMark)) {
            const consequent = this.expression();

            if (!this.match(TokenType.Colon)) {
                this.error(
                    ErrorCodes.parser.MISSING_COLON,
                    "Expected ':' in conditional (ternary) expression.",
                    "Ternary expressions must have the form: condition ? expr1 : expr2.",
                    `Found token: '${this.peek().value}' instead of ':'`,
                    [":"],
                    "'x > 0 ? 'positive' : 'negative';'"
                );
            }

            const alternate = this.conditional_expression();

            return {
                type: 'TertiaryExpression',
                token: this.peek(),
                condition,
                consequent,
                alternate,
                accept(visitor) {
                    return visitor.visitTertiaryExpression?.(this);
                }
            } as ASTNode;
        }

        return condition;
    }

    private logical_or_expression(): ASTNode {
        let expr = this.logical_and_expression();

        while (this.match(TokenType.Or)) {
            const operator = this.previous().value;
            const right = this.logical_and_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private logical_and_expression(): ASTNode {
        let expr = this.bitwise_or_expression();

        while (this.match(TokenType.And)) {
            const operator = this.previous().value;
            const right = this.bitwise_or_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private bitwise_or_expression(): ASTNode {
        let expr = this.bitwise_xor_expression();

        while (this.match(TokenType.Pipe)) {
            const operator = this.previous().value;
            const right = this.bitwise_xor_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }


    private bitwise_xor_expression(): ASTNode {
        let expr = this.bitwise_and_expression();

        while (this.match(TokenType.Caret)) {
            const operator = this.previous().value;
            const right = this.bitwise_and_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private bitwise_and_expression(): ASTNode {
        let expr = this.equality_expression();

        while (this.match(TokenType.Ampersand)) {
            const operator = this.previous().value;
            const right = this.equality_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private equality_expression(): ASTNode {
        let expr = this.relational_expression();

        while (this.is_equality_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.relational_expression();

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_equality_operator(type: TokenType): boolean {
        return type === TokenType.IsEqual ||
            type === TokenType.IsNotEqual
    }

    private relational_expression(): ASTNode {
        let expr = this.shift_expression();

        while (this.is_relational_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.shift_expression();

            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private is_relational_operator(type: TokenType): boolean {
        return type === TokenType.LT ||
            type === TokenType.LTE ||
            type === TokenType.GT ||
            type === TokenType.GTE
    }

    private shift_expression(): ASTNode {
        let expr = this.additive_expression();

        while (this.is_shift_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.additive_expression();

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_shift_operator(type: TokenType): boolean {
        return type === TokenType.SR || // come back here
            type === TokenType.SL
    }

    private additive_expression(): ASTNode {
        let expr = this.multiplicative_expression();

        while (this.is_additive_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.multiplicative_expression();

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_additive_operator(type: TokenType): boolean {
        return type === TokenType.Plus ||
            type === TokenType.Minus
    }


    private multiplicative_expression(): ASTNode {
        let expr = this.unary_expression();

        while (this.is_multiplicative_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.unary_expression();
            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_multiplicative_operator(type: TokenType): boolean {
        return type === TokenType.Multiply ||
            type === TokenType.Divide ||
            type === TokenType.Modulo
    }


    private unary_expression(): ASTNode {
        return this.postfix_expression();
    }

    private postfix_expression(): ASTNode {
        let expr: ASTNode = this.primary_expression();

        while (true) {
            if (this.match(TokenType.LeftBracket)) {
                const index = this.expression();

                if (!this.match(TokenType.RightBracket)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_BRACKET,
                        "Expected ']' after array index.",
                        "Arrays are accessed using square brackets, and each opening '[' must be closed with a ']'.",
                        `Found token: '${this.peek().value}' instead of ']'`,
                        ["]"],
                        "'my_array[0]'"
                    );
                }

                expr = new MemberExpressionNode(this.peek(), expr, index, true);
            }
            else if (this.match(TokenType.LeftParen)) {
                const args: ASTNode[] = [];

                if (!this.check(TokenType.RightParen)) {
                    do {
                        args.push(this.assignment_expression());
                    } while (this.match(TokenType.Comma));
                }

                if (!this.match(TokenType.RightParen)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_PAREN,
                        "Expected ')' after function call arguments.",
                        "Function calls require parentheses around their arguments, and all opening '(' must be closed.",
                        `Found token: '${this.peek().value}' instead of ')'`,
                        [")"],
                        "'my_func(arg1, arg2)'"
                    );
                }

                expr = new CallExpressionNode(this.peek(), expr, args);
            }
            else if (this.match(TokenType.Dot)) {
                if (!this.match(TokenType.Identifier)) {
                    this.error(
                        ErrorCodes.parser.MISSING_DOT,
                        "Expected an identifier after '.' in member access.",
                        "When using '.' to access an object's property, it must be followed by a valid identifier.",
                        `Found token: '${this.peek().value}' instead of an identifier`,
                        ["identifier"],
                        "'object.property'"
                    );
                }

                expr = new MemberExpressionNode(
                    this.peek(),
                    expr,
                    new IdentifierNode(this.peek(), this.previous().value),
                    false
                );
            }
            else {
                break;
            }
        }

        return expr;
    }

    private primary_expression(): ASTNode {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
            case TokenType.Number:
            case TokenType.String:
                return this.constants();
            case TokenType.LeftBracket:
                return this.array();
            case TokenType.LeftBrace:
                return this.map_or_set();
            case TokenType.Fun:
                return this.lambda_function();
            case TokenType.Identifier: {
                const iden = this.scoped_identifier();
                if (this.peek().type == TokenType.LeftBrace) {
                    const fields = this.struct_initializer();
                    return new StructInitNode(this.peek(), iden, fields);
                }
                return iden;
            }
            case TokenType.LeftParen: {
                this.advance();
                const expr = this.expression();
                if (!this.match(TokenType.RightParen)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_PAREN,
                        "Expected ')' after expression.",
                        "Parenthesized expressions must be closed with a matching ')'.",
                        `Found token: '${this.peek().value}' instead of ')'`,
                        [")"],
                        "'(x + y)'"
                    );
                }
                if (expr instanceof ExpressionNode) {
                    return new TupleNode(this.peek(), expr.expressions);
                }
                return expr;
            }
            default:
                return this.error(
                    ErrorCodes.parser.UNEXPECTED_TOKEN,
                    "Expected a primary expression.",
                    "A primary expression can be a literal (number, string, boolean), an array, a map, a set, a lambda function, an identifier, or a parenthesized expression.",
                    `Found unexpected token: '${this.peek().value}'`,
                    ["number", "string", "true", "false", "[", "{", "fun", "identifier", "("],
                    "'42', 'hello', 'true', '[1, 2]', '{key: value}', {1, 2, 3}, 'fun() -> unit {}'");
        }
    }

    private constants(): ASTNode {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
                return this.boolean();
            case TokenType.Number:
                return this.number();
            case TokenType.String:
                return this.string();
            default:
                this.error(
                    ErrorCodes.parser.INVALID_CONSTANT,
                    "Expected a constant value.",
                    "Constants can be numbers, strings, or boolean values.",
                    `Found token: '${this.peek().value}' which is not a valid constant`,
                    ["number", "string", "true", "false"],
                    "'42', 'hello', 'true', 'false'"
                );
        }
    }

    private number(): NumberNode {
        if (!this.match(TokenType.Number)) {
            this.error(
                ErrorCodes.parser.EXPECTED_NUMBER,
                "Expected a number literal.",
                "A valid number can be an integer or a floating-point value.",
                `Found token: '${this.peek().value}' instead of a number`,
                ["number"],
                "'42', '3.14'"
            );
        }
        return new NumberNode(this.peek(), +this.previous().value);
    }

    private boolean(): BooleanNode {
        if (!this.match(TokenType.True) && !this.match(TokenType.False)) {
            this.error(
                ErrorCodes.parser.EXPECTED_BOOLEAN,
                "Expected a boolean literal.",
                "A boolean literal must be either 'true' or 'false'.",
                `Found token: '${this.peek().value}' instead of 'true' or 'false'`,
                ["true", "false"],
                "'true', 'false'"
            );
        }
        return new BooleanNode(this.peek(), this.previous().type == TokenType.True);
    }

    private string(): StringNode {
        if (!this.match(TokenType.String)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRING,
                "Expected a string literal.",
                "String literals are enclosed in quotes.",
                `Found token: '${this.peek().value}' instead of a string`,
                ["string"],
                "'hello world'"
            );
        }
        return new StringNode(this.peek(), this.previous().value);
    }

    private array(): ArrayNode {
        const elements: ASTNode[] = [];
        if (!this.match(TokenType.LeftBracket)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACKET,
                "Expected '[' to begin array literal.",
                "Array literals must start with an opening square bracket '['.",
                `Found token: '${this.peek().value}' instead of '['`,
                ["["],
                "'[1, 2, 3]'"
            );
        }

        if (!this.check(TokenType.RightBracket)) {
            do {
                elements.push(this.conditional_expression());
            } while (this.match(TokenType.Comma));
        }

        if (!this.match(TokenType.RightBracket)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACKET,
                "Expected ']' after array elements.",
                "Array literals must end with a closing square bracket ']'.",
                `Found token: '${this.peek().value}' instead of ']'`,
                ["]"],
                "'[1, 2, 3]'"
            );
        }

        return new ArrayNode(this.peek(), elements);
    }

    private map_or_set(): ASTNode {
        const elements: ASTNode[] = [];
        const properties: PropertyNode[] = [];
        let is_ds: "none" | "set" | "map" = "none";

        // Ensure that the map or set starts with a left brace
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected a '{'.",
                "Map or set declarations must start with a left brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'{1, 2, 3}' or '{key: value, key2: value2}'"
            );
        }

        // If the map or set isn't just an empty brace, continue parsing the elements or properties
        if (!this.check(TokenType.RightBrace)) {
            do {
                let keyExpr = this.assignment_expression();

                // Handle key-value pairs (map)
                if (this.match(TokenType.Colon)) {
                    if (is_ds == "set") {
                        this.error(
                            ErrorCodes.parser.INVALID_MIX_SET_COMBO,
                            "Cannot have key-value pairs in a set.",
                            "In a set, you cannot mix key-value pairs with standalone values.",
                            `Found token: '${this.peek().value}' instead of a valid standalone value`,
                            ["set"],
                            "- valid: '{1, 2, 3}' invalid: {1, key: \"value\"}"
                        );
                    }

                    is_ds = "map";

                    const valueExpr = this.assignment_expression();

                    // Add properties to the map
                    if (keyExpr instanceof StringNode) {
                        properties.push(new PropertyNode(this.peek(), keyExpr.value, valueExpr));
                    } else if (keyExpr instanceof ScopedIdentifierNode) {
                        properties.push(new PropertyNode(this.peek(), keyExpr.name[0], valueExpr));
                    }
                } else {
                    // Handle standalone values (set)
                    if (is_ds == "map") {
                        this.error(
                            ErrorCodes.parser.INVALID_MIX_SET_COMBO,
                            "Cannot have standalone values in a map.",
                            "You cannot mix key-value pairs with standalone values in a map.",
                            `Found token: '${this.peek().value}' instead of a valid keyvalue pair`,
                            ["map"],
                            "- valid: '{key: value, key2: value2}' invalid: {key: \"value\", 1}"
                        );
                    }

                    is_ds = "set";
                    elements.push(keyExpr);
                }
            } while (this.match(TokenType.Comma) && !this.check(TokenType.RightBrace));
        }

        // Ensure the map or set ends with a right brace
        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected a '}'.",
                "Map or set declarations must end with a right brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'{1, 2, 3}' or '{key: value, key2: value2}'"
            );
        }

        // Return the appropriate AST node based on whether it's a map or set
        return is_ds == "none" ? new MapNode(this.peek(), []) : is_ds == "map"
            ? new MapNode(this.peek(), properties) : new SetNode(this.peek(), elements);
    }

    private struct_initializer() {
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin struct initialization.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const fields = this.struct_fields();

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' after struct fields.",
                "Struct initialization must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'Person{name: \"John\", age: 30}'"
            );
        }

        return fields;
    }

    private struct_fields(): StructFieldNode[] {
        const fields: StructFieldNode[] = [];

        if (this.check(TokenType.RightBrace)) {
            return fields;
        }

        while (true) {
            fields.push(this.struct_field());

            if (this.match(TokenType.Comma)) {
                if (this.check(TokenType.RightBrace)) {
                    break;
                }
            } else {
                break;
            }
        }

        return fields;
    }

    private struct_field() {
        const iden = this.identifier();
        let expr;

        if (this.match(TokenType.Colon)) {
            expr = this.assignment_expression()
        }

        return new StructFieldNode(this.peek(), iden, expr)
    }

    /**
struct_statement ::= export_modifier? "struct" identifier (type_parameters)? ("impl" trait_impl ("," trait_impl)*)? "{" (struct_body)? "}"
trait_impl ::= identifier (type_arguments)?
type_parameters ::= "<" type_parameter ("," type_parameter)* ">"
type_arguments ::= "<" type ("," type)* ">"
struct_body ::= (struct_member ";")*
struct_member ::= struct_field | struct_method
struct_field ::= ("mut")? identifier type_annotation
struct_method ::= "fun" identifier "(" parameter_list ")" (type_annotation)? function_body
     */
    private struct_statement(): StructNode {
        if (!this.match(TokenType.Struct)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRUCT_KEYWORD,
                "Expected 'struct' keyword to begin struct declaration.",
                "Struct declarations must start with the 'struct' keyword.",
                `Found token: '${this.peek().value}' instead of 'struct'`,
                ["struct"],
                "'struct Person { name: string; age: number; }'"
            );
        }

        // Parse struct name
        if (!this.check(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRUCT_NAME,
                "Expected struct name after 'struct' keyword.",
                "A struct declaration requires a valid identifier as its name.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'struct Person { ... }'"
            );
        }

        const name = this.peek().value;
        this.advance();

        let tp: TypeParameterNode[] | undefined = undefined;

        // Parse type parameters if present: "<" type_parameter ("," type_parameter)* ">"
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            if (!this.match(TokenType.GT)) {
                this.error(
                    ErrorCodes.parser.MISSING_GREATER_THAN,
                    "Expected '>' to close type parameter list.",
                    "Type parameter lists in struct declarations must be closed with '>'.",
                    `Found token: '${this.peek().value}' instead of '>'`,
                    [">"],
                    "'struct List<T> { ... }'"
                );
            }
        }

        // Parse trait implementations if present: "impl" trait_impl ("," trait_impl)*
        if (this.match(TokenType.Impl)) {
            // Implementation details would go here
            // For now, we just keep the existing empty block
        }

        // Parse struct body
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin struct body.",
                "Struct declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'struct Person { name: string; age: number; }'"
            );
        }

        let body = this.struct_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close struct body.",
                "Struct declarations must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'struct Person { name: string; age: number; }'"
            );
        }

        // Optional semicolon after struct declaration
        if (this.match(TokenType.SemiColon)) { }

        return new StructNode(this.peek(), name, body, false, tp);
    }

    // struct_body ::= (struct_member)*
    private struct_body(): ASTNode[] {
        const fields: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace)) {

            if (this.check(TokenType.Fun)) {
                let fun = this.function_declaration();

                if (fun.params?.parameters[0].identifier.name == "self") {
                    fun = new MemberDecNode(this.peek(), fun)
                }

                fields.push(fun);
            } else {
                fields.push(this.field());
            }
        }

        return fields;
    }

    // struct_field ::= ("mut")? identifier type_annotation ";"
    private field(): FieldNode {
        let mutable = false;
        if (this.match(TokenType.Mut)) {
            mutable = true;
        }

        // Parse the field identifier
        if (!this.check(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_FIELD_NAME,
                "Expected field name in struct declaration.",
                "Struct fields must be valid identifiers.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'name: string;'"
            );
        }

        const identifier = this.identifier();

        // Parse the type annotation
        let data_type = this.type_annotation();

        // Expect a semicolon after the field declaration
        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';' after field declaration.",
                "Each field declaration in a struct must end with a semicolon ';'.",
                `Found token: '${this.peek().value}' instead of ';'`,
                [";"],
                "'name: string;'"
            );
        }

        return new FieldNode(this.peek(), identifier, mutable, data_type);
    }

    private enum_statement(): EnumNode {
        // Expect the 'enum' keyword
        if (!this.match(TokenType.Enum)) {
            this.error(
                ErrorCodes.parser.EXPECTED_ENUM_KEYWORD,
                "Expected 'enum' keyword to begin enum declaration.",
                "Enum declarations must start with the 'enum' keyword.",
                `Found token: '${this.peek().value}' instead of 'enum'`,
                ["enum"],
                "'enum Color { Red, Green, Blue }'"
            );
        }

        // Parse enum name
        if (!this.check(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_ENUM_NAME,
                "Expected enum name after 'enum' keyword.",
                "An enum declaration requires a valid identifier as its name.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'enum Color { ... }'"
            );
        }

        const name = this.peek().value;
        this.advance();

        // Parse optional type parameters
        let tp: TypeParameterNode[] | undefined = undefined;
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();
            if (!this.match(TokenType.GT)) {
                this.error(
                    ErrorCodes.parser.MISSING_GREATER_THAN,
                    "Expected '>' to close type parameter list.",
                    "Type parameter lists in enum declarations must be closed with '>'.",
                    `Found token: '${this.peek().value}' instead of '>'`,
                    [">"],
                    "'enum Result<T, E> { ... }'"
                );
            }
        }

        // Parse enum body
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin enum body.",
                "Enum declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'enum Color { Red, Green, Blue }'"
            );
        }

        let body = this.enum_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close enum body.",
                "Enum declarations must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'enum Color { Red, Green, Blue }'"
            );
        }

        // Optional semicolon after enum declaration
        if (this.match(TokenType.SemiColon)) { }

        return new EnumNode(this.peek(), name, body, false, tp);
    }

    private enum_body(): EnumVariantNode[] {
        const variants: EnumVariantNode[] = [];

        while (!this.check(TokenType.RightBrace)) {
            // Parse variant name
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_VARIANT_NAME,
                    "Expected an identifier for enum variant.",
                    "Enum variants must be valid identifiers.",
                    `Found token: '${this.peek().value}' instead of an identifier`,
                    ["identifier"],
                    "'Red' in 'enum Color { Red, Green, Blue }'"
                );
            }

            const name = this.previous().value;
            let value: EnumVariantValueNode | undefined = undefined;

            // Parse struct variant if present
            if (this.match(TokenType.LeftBrace)) {
                value = new StructNode(
                    this.peek(),
                    name,
                    this.struct_body()
                );

                if (!this.match(TokenType.RightBrace)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_BRACE,
                        "Expected '}' to close struct variant.",
                        "Struct variants in enums must be closed with a closing curly brace '}'.",
                        `Found token: '${this.peek().value}' instead of '}'`,
                        ["}"],
                        "'Point { x: number, y: number }'"
                    );
                }
            }
            // Parse tuple variant if present
            else if (this.match(TokenType.LeftParen)) {
                value = new TupleVariantNode(this.peek(), this.tuple_payload());

                if (!this.match(TokenType.RightParen)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_PAREN,
                        "Expected ')' to close tuple variant.",
                        "Tuple variants in enums must be closed with a closing parenthesis ')'.",
                        `Found token: '${this.peek().value}' instead of ')'`,
                        [")"],
                        "'Pair(T, U)'"
                    );
                }
            }

            variants.push(new EnumVariantNode(this.peek(), name, value));

            // Expect comma between variants unless we're at the end
            if (!this.match(TokenType.Comma)) {
                if (!this.check(TokenType.RightBrace)) {
                    this.error(
                        ErrorCodes.parser.MISSING_COMMA,
                        "Expected ',' after enum variant.",
                        "Enum variants must be separated by commas.",
                        `Found token: '${this.peek().value}' instead of ','`,
                        [","],
                        "'enum Color { Red, Green, Blue }'"
                    );
                }
            }
        }

        return variants;
    }

    private tuple_payload(): ASTNode[] {
        const types: ASTNode[] = [];

        do {
            types.push(this.type());
        } while (this.match(TokenType.Comma));

        return types;
    }

    /*
    module_statement ::= (export_modifier)? "module" identifier "{" (module_body)? "}"
    module_body ::= (module_item)*
    module_item ::= (export_modifier)? source_element
    export_modifier ::= "export"
    */
    private module_statement(): ModuleNode {
        // Expect the 'module' keyword
        if (!this.match(TokenType.Module)) {
            this.error(
                ErrorCodes.parser.EXPECTED_MODULE_KEYWORD,
                "Expected keyword 'module' to begin module declaration.",
                "Module declarations must start with the 'module' keyword.",
                `Found token: '${this.peek().value}' instead of 'module'`,
                ["module"],
                "'module graphics { ... }'"
            );
        }

        // Parse module name
        if (!this.check(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_MODULE_NAME,
                "Expected module name after 'module' keyword.",
                "A module declaration requires a valid identifier as its name.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'module graphics { ... }'"
            );
        }

        let identifier = this.identifier();

        // Parse module body
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin module body.",
                "Module declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'module graphics { fun draw() { ... } }'"
            );
        }

        let body = this.module_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close module body.",
                "Module declarations must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'module graphics { fun draw() { ... } }'"
            );
        }

        return new ModuleNode(this.peek(), identifier, body);
    }

    private module_body(): ASTNode[] {
        const items: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace)) {
            let is_public = false;

            // Check for 'export' keyword
            if (this.match(TokenType.Export)) {
                is_public = true;
            }

            const item = this.source_element();

            // Error handling for exported nodes
            if (is_public) {
                if (item instanceof StructNode || item instanceof FunctionDecNode || item instanceof EnumNode) {
                    item.exported = true;
                } else {
                    this.error(
                        ErrorCodes.parser.INVALID_EXPORT_NODE,
                        `Node '${item.type}' can't be exported.`,
                        "Only structures, functions, and enums can be exported.",
                        `Found node type: '${item.type}' instead of 'struct', 'function', or 'enum'`,
                        ["struct", "function", "enum"],
                        "'export struct MyStruct { ... }'"
                    );
                }
            }

            items.push(item);
        }

        return items;
    }

    // import_statement ::= "import" identifier ";"
    private import(): ImportNode {
        // Check for 'import' keyword
        if (!this.match(TokenType.Import)) {
            this.error(
                ErrorCodes.parser.EXPECTED_IMPORT_KEYWORD,
                "Expected keyword 'import'.",
                "Import statements must begin with the 'import' keyword.",
                `Found token: '${this.peek().value}' instead of 'import'`,
                ["import"],
                "'import myModule;'"
            );
        }

        // Parse the identifier (module or resource name)
        let identifier = this.identifier();

        // Check for the semicolon at the end of the import statement
        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';'.",
                "Import statements must end with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'`,
                [";"],
                "'import myModule;'"
            );
        }

        return new ImportNode(this.peek(), identifier);
    }

    /*
    use_statement ::= "use" use_path ("as" identifier)? ";"
        | "use" use_path "{" use_list "}"";"
    use_path ::= identifier ("::" identifier)*
    use_list ::= use_item ("," use_item)* 
    use_item ::= identifier ("as" identifier)?
        | "*"
    */
    private use(): UseNode {
        // Check for 'use' keyword
        if (!this.match(TokenType.Use)) {
            this.error(
                ErrorCodes.parser.EXPECTED_USE_KEYWORD,
                "Expected keyword 'use'.",
                "Use statements must begin with the 'use' keyword.",
                `Found token: '${this.peek().value}' instead of 'use'`,
                ["use"],
                "'use myModule;'"
            );
        }

        const use_token = this.peek();

        // Parse the path
        let path = this.use_path();
        let list = undefined, alias = undefined;

        // Check for left brace, indicating a use list
        if (this.match(TokenType.LeftBrace)) {
            list = this.use_list();
            if (!this.match(TokenType.RightBrace)) {
                this.error(
                    ErrorCodes.parser.MISSING_RIGHT_BRACE,
                    "Expected token '}' to close the use list.",
                    "A use list must be enclosed in curly braces.",
                    `Found token: '${this.peek().value}' instead of '}'`,
                    ["}"],
                    "'use myModule::{ function1, function2 };'"
                );
            }
        } else if (this.match(TokenType.As)) {
            // Check for alias keyword 'as'
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_IDENTIFIER,
                    "Expected an identifier after 'as'.",
                    "An alias must be specified after the 'as' keyword.",
                    `Found token: '${this.peek().value}' instead of an identifier`,
                    ["identifier"],
                    "'use myModule as MyAlias;'"
                );
            }
            alias = this.previous().value;
        }

        // Ensure a semicolon is present at the end of the use statement
        if (!this.match(TokenType.SemiColon)) {
            this.error(
                ErrorCodes.parser.MISSING_SEMICOLON,
                "Expected ';'.",
                "Use statements must end with a semicolon.",
                `Found token: '${this.peek().value}' instead of ';'`,
                [";"],
                "'use myModule;'"
            );
        }

        return new UseNode(use_token, path, list, alias);
    }

    private use_path(): UsePathNode {
        const path = [];

        do {
            // If the next token is a left brace, stop processing (end of path)
            if (this.check(TokenType.LeftBrace))
                break;

            // Ensure we have an identifier at each step of the path
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_IDENTIFIER,
                    "Expected an identifier.",
                    "A valid identifier is required for the path.",
                    `Found token: '${this.peek().value}' instead of an identifier`,
                    ["identifier"],
                    "'use module::function;'"
                );
            }

            path.push(this.previous().value);

        } while (this.match(TokenType.Scope));  // Continue if the scope operator ('::') is present

        return new UsePathNode(this.peek(), path);
    }

    private use_list() {
        const items: UseItemNode[] = [];

        do {
            items.push(this.use_item())
        } while (this.match(TokenType.Comma))

        return new UseListNode(this.peek(), items);
    }

    private use_item(): UseItemNode {
        // Check for identifier (the name of the item being used)
        if (!this.match(TokenType.Identifier)) {
            this.error(
                ErrorCodes.parser.EXPECTED_IDENTIFIER,
                "Expected an identifier.",
                "A valid identifier is required for the item name.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'use myModule::my_function;'"
            );
        }

        let name = this.previous().value;
        let alias = undefined;

        // Check for alias keyword 'as'
        if (this.match(TokenType.As)) {
            // Ensure that the alias is a valid identifier
            if (!this.match(TokenType.Identifier)) {
                this.error(
                    ErrorCodes.parser.EXPECTED_IDENTIFIER,
                    "Expected an identifier for alias.",
                    "An alias must be specified after 'as'.",
                    `Found token: '${this.peek().value}' instead of an identifier`,
                    ["identifier"],
                    "'use myModule::{ myFunction as MyFunc };'"
                );
            }

            alias = this.previous().value;
        }

        return new UseItemNode(this.peek(), name, alias);
    }
}