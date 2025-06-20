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
    PathNode,
    SetNode,
    SourceElementsNode,
    StringNode,
    StructInitNode,
    StructFieldNode,
    StructNode,
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
    LambdaNode,
    AliasNode,
    ForNode,
    RangeNode,
    SpreadElementNode,
    MatchNode,
    MatchArmNode,
    WildcardNode,
    EnumPatternNode,
    IfLetNode,
    ImplNode,
    AttributeNode,
    MacroFunctionNode,
    MetaItemNode,
    MetaSeqItemNode,
    UnaryOpNode,
    TuplePatternNode,
    FieldPatternNode,
    StructPatternNode,
    WhileLetNode,
    Key,
    TraitSigNode,
    TraitNode,
    PostfixOpNode,
    BreakNode,
    ContinueNode,
    YieldNode,
    TertiaryExpressionNode,
    CoroNode,
    SpawnNode,
    UnitNode,
} from "./ast";

import { Token } from "../lexer/lexer";
import { TokenType } from "../lexer/token";
import { ErrorCodes, TError } from "../error/error";

export interface Args {
    statement: boolean,
    no_init: boolean,
    constant: boolean,
    ignore_type: boolean,
    skip_struct_init: boolean,
    attributes: AttributeNode[],
    skip_generic: boolean
}

export class BodyError extends Error {
    constructor(
        public message: string
    ) {
        super();
    }
}

export class Parser {
    private tokens: Token[] = [];
    private current: number = 0;
    private file_path: string;
    private yield: boolean = false;

    constructor(
        tokens: Token[],
        file_path: string
    ) {
        this.file_path = file_path;
        this.tokens = tokens.filter(token => token.type !== TokenType.Newline);
    }

    private peek(start: number = 0): Token {
        return this.tokens[this.current + start];
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

    private backtrack(): Token {
        if (this.current > 0) this.current--;
        return this.peek();
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
            file: this.file_path,
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
        let source = this.source_elements({} as Args);

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
    private source_elements(args: Args): SourceElementsNode {
        const sources: ASTNode[] = [];

        while (!this.is_at_end()) {
            sources.push(this.source_element(args));
        }

        return new SourceElementsNode(this.peek(), sources);
    }

    /*
        source_element ::= statement
    */
    private source_element(args: Args): ASTNode {
        const statement = this.statement({
            ...args,
            statement: true
        });

        // if (
        //     statement instanceof ExpressionStatementNode
        // ) {
        //     // executable code should only be nested in functions not in root scope
        //     this.error(
        //         ErrorCodes.parser.EXECUTABLE_CODE_IN_ROOT_SCOPE,
        //         "Executable code is not allowed in the root scope.",
        //     )
        // }

        // if (statement instanceof VariableStatementNode) {
        //     if (!statement.variables.constant) {
        //         // only constant variables are allowed in root scope
        //         this.error(
        //             'NON_CONST_VARIABLE_IN_ROOT_SCOPE',
        //             "Variables are not allowed in the root scope.",
        //         )
        //     }

        //     if (statement.variables.expression) {
        //         switch (statement.variables.expression.type) {
        //             case 'CallExpression':
        //                 this.error(
        //                     'CALL_EXPRESSION_IN_ROOT_SCOPE',
        //                     "Constant variables in root scope can't be initialized with a function call.",
        //                 )
        //         }
        //     }
        // }

        return statement
    }

    /**
     statement ::= variable_statement
        | import_statement
        | use_statement
        | empty_statement
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
    private statement(args: Args): ASTNode {
        const iden = this.peek().type;

        switch (iden) {
            case TokenType.Hash: {
                const attrs = [];
                while (this.check(TokenType.Hash)) {
                    attrs.push(this.attribute(args));
                }
                return this.statement({
                    ...args,
                    attributes: attrs
                });
            }
            case TokenType.Fun:
                return this.function_declaration(args);
            case TokenType.While:
                return this.while_statement(args);
            case TokenType.Loop:
                return this.loop_statement(args);
            case TokenType.For:
                return this.for_statement(args);
            case TokenType.Return:
                return this.return_statement(args);
            case TokenType.Break:
                return this.break_statement(args);
            case TokenType.Continue:
                return this.continue_statement(args);
            case TokenType.Struct:
                return this.struct_statement(args);
            case TokenType.Enum:
                return this.enum_statement(args);
            case TokenType.Module:
                return this.module_statement(args);
            case TokenType.Import:
                return this.import(args);
            case TokenType.Use:
                return this.use(args);
            case TokenType.Type:
                return this.alias(args);
            case TokenType.Impl:
                return this.impl(args);
            case TokenType.Trait:
                return this.trait(args);
            case TokenType.Const:
            case TokenType.Let:
                {
                    const node = this.variable_statement(args);
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

        return this.expression_statement(args);
    }

    private expect(type: TokenType, errorConfig: {
        error: string,
        message: string,
        hint: string,
        expected: string[],
        example: string
    }): void {
        if (!this.match(type)) {
            this.error(
                errorConfig.error,
                errorConfig.message,
                errorConfig.hint,
                `Found token: '${this.peek().value}' instead of ${errorConfig.expected[0]}`,
                errorConfig.expected,
                errorConfig.example
            );
        }
    }

    private parseDelimitedList<T>({
        parseItem,
        delimiter,
        closingToken,
        errorConfig
    }: {
        parseItem: () => T,
        delimiter: TokenType,
        closingToken: TokenType,
        errorConfig: {
            error: string,
            message: string,
            hint: string,
            expected: string[],
            example: string
        }
    }): T[] {
        const items: T[] = [];

        while (!this.match(closingToken)) {
            items.push(parseItem());
            if (!this.match(delimiter)) {
                break;
            }
        }

        // Check for closing token
        if (!this.match(closingToken)) {
            this.error(
                errorConfig.error,
                errorConfig.message,
                errorConfig.hint,
                `Found token: '${this.peek().value}' instead of ${errorConfig.expected[0]}`,
                errorConfig.expected,
                errorConfig.example
            );
        }

        return items;
    }

    private attribute(args: Args): AttributeNode {
        const token = this.peek();

        if (!this.match(TokenType.Hash)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected '#' to start an attribute.",
                "Attributes must begin with the '#' symbol.",
                `Found token: '${this.peek().value}' instead of '#'`,
                ["'#'"],
                "#[attribute_name]"
            );
        }

        if (!this.match(TokenType.LeftBracket)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected '[' after '#' in attribute.",
                "Attributes use square brackets like #[...].",
                `Found token: '${this.peek().value}' instead of '['`,
                ["'['"],
                "#[attribute_name]"
            );
        }

        const meta_item = this.parseMetaItem(args);

        if (!this.match(TokenType.RightBracket)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected ']' to close the attribute.",
                "Attributes must end with a closing bracket.",
                `Found token: '${this.peek().value}' instead of ']'`,
                ["']'"],
                "#[attribute_name]"
            );
        }

        return new AttributeNode(token, meta_item);
    }

    private parseMetaItem(args: Args): MetaItemNode {
        const startToken = this.peek();
        const path = this.path_identifier(args);

        if (this.match(TokenType.Equals)) {
            const value = this.constants(args);
            return new MetaItemNode(startToken, path, value);
        }

        if (this.match(TokenType.LeftParen)) {
            const metaSeq = this.parseDelimitedList({
                parseItem: () => this.parseMetaSeqItem(args),
                delimiter: TokenType.Comma,
                closingToken: TokenType.RightParen,
                errorConfig: {
                    error: ErrorCodes.parser.SYNTAX_ERROR,
                    message: "Expected ')' to close meta item arguments.",
                    hint: "Meta item argument lists must be enclosed in parentheses.",
                    expected: ["')'"],
                    example: "key(item1, item2)"
                }
            });
            return new MetaItemNode(startToken, path, undefined, metaSeq);
        }

        return new MetaItemNode(startToken, path);
    }

    private parseMetaSeqItem(args: Args): MetaSeqItemNode {
        const token = this.peek();

        if (this.isLiteralToken(this.peek().type)) {
            const literal = this.constants(args);
            return new MetaSeqItemNode(token, undefined, literal);
        }

        const metaItem = this.parseMetaItem(args);
        return new MetaSeqItemNode(token, metaItem);
    }

    private isLiteralToken(tokenType: TokenType): boolean {
        return [
            TokenType.String,
            TokenType.True,
            TokenType.False,
            TokenType.Number,
        ].includes(tokenType);
    }

    // function_declaration ::= "fun" identifier (type_parameters)? "(" (parameter_list)? ")" type_annotation function_body
    public function_declaration(args: Args): FunctionDecNode | TraitSigNode {
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

        this.yield = false;

        const fun_token = this.peek();

        const functionName = this.identifier(args);
        let tp: TypeParameterNode[] | undefined = undefined;

        // Check for type parameters (generic functions)
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters(args);

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
                "'fun my_function(param1: num, param2: string) { ... }'"
            );
        }

        // Parse the function parameters
        let parameters = this.parameters_list(args);

        // Expect closing parenthesis after parameters
        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after parameters.",
                "Ensure the function declaration is followed by ')' to close the parameter list.",
                `Found token: '${this.peek().value}' instead of ')'`,
                [")"],
                "'fun my_function(param1: num, param2: string) { ... }'"
            );
        }

        let rt: ASTNode;

        // Check if return type is specified
        if (this.match(TokenType.Colon)) {
            rt = this.type(args);
        } else {
            this.error(
                ErrorCodes.parser.MISSING_RETURN_TYPE,
                `Function '${functionName.name}' requires a return type annotation.`,
                "Ensure the function is followed by a return type after a colon ':' if needed.",
                `Found token: '${this.peek().value}' instead of a return type.`,
                [":"],
                "'fun my_function(): num { ... }'"
            );
        }

        let body;

        try {
            body = this.block(args);
            body.name = `fn_body_${functionName.name}`;
        } catch (e) {
            if (e instanceof BodyError) {
                throw new Error(e.message);
            }

            // some errors can be ignored here
            if (!this.match(TokenType.SemiColon)) {
                this.error(
                    ErrorCodes.parser.SYNTAX_ERROR,
                    "Expected ';' after function signature.",
                    "Ensure the function signature is followed by a ';' token.",
                    `Found token: '${this.peek().value}' instead of ';'`,
                    [";"],
                    "'fun my_function();'"
                )
            }

            return new TraitSigNode(
                fun_token,
                functionName,
                parameters,
                tp,
                rt,
                args.attributes
            )
        }

        // let coro = this.yield;

        // this.yield = false;

        // if (coro) {
        //     return new CoroNode(
        //         fun_token,
        //         functionName,
        //         parameters,
        //         body,
        //         false,
        //         false,
        //         false,
        //         tp,
        //         rt,
        //         args.attributes,
        //     )
        // }

        return new FunctionDecNode(
            fun_token,
            functionName,
            parameters,
            body,
            false,
            false,
            false,
            tp,
            rt,
            args.attributes,
        );
    }

    private lambda_function(args: Args): LambdaNode {
        const fun_token = this.peek();
        // Expect function keyword ('fun') for lambda function
        if (!this.match(TokenType.Fun)) {
            this.error(
                ErrorCodes.parser.SYNTAX_ERROR,
                "Expected 'fun' keyword to define a lambda function.",
                "Ensure you're starting the lambda function declaration with the 'fun' keyword.",
                `Found token: '${this.peek().value}' instead of 'fun'.`,
                ["'fun'"],
                "'fun (x: num, y: num) -> x + y'"
            );
        }

        let tp: TypeParameterNode[] | undefined = undefined;

        // Check for type parameters (generic lambdas)
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters(args);

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
                "'fun (x: num, y: num) -> x + y'"
            );
        }

        // Parse the lambda function parameters
        let parameters = this.parameters_list({
            ...args,
            ignore_type: true
        });

        // Expect closing parenthesis after parameters
        if (!this.match(TokenType.RightParen)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_PAREN,
                "Expected ')' after parameters.",
                "Ensure the lambda function declaration is followed by ')' to close the parameter list.",
                `Found token: '${this.peek().value}' instead of ')'`,
                [")"],
                "'fun (x: num, y: num) -> x + y'"
            );
        }

        let rt: ASTNode | undefined = undefined;

        // Check if return type is specified
        if (this.match(TokenType.Colon)) {
            rt = this.type(args);
        }

        let body;

        // Expect the arrow (->) for the lambda body
        if (this.match(TokenType.Arrow)) {
            // Check if body is a block or an expression
            if (this.check(TokenType.LeftBrace)) {
                body = this.block(args);
            } else {
                body = this.expression(args);
            }
        } else {
            this.error(
                ErrorCodes.parser.MISSING_ARROW,
                "Expected token '->' for lambda functions.",
                "Ensure you're using the '->' arrow token to separate parameters from the body in a lambda function.",
                `Found token: '${this.peek().value}' instead of '->'`,
                ["'->'"],
                "'fun (x: num, y: num) -> x + y'"
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

    private parameters_list(args: Args): ParametersListNode | undefined {
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
                    "'fun sum(a: num, b: num, ...rest: (number)) { ... }'"
                );
            }

            // Parse the current parameter
            const n = this.parameter(args);

            // Check if the current parameter is variadic
            if (n.variadic) {
                seen_variadic = true;
            }

            parameters.push(n);
        } while (this.match(TokenType.Comma)); // Continue parsing if we encounter a comma

        // Return the parameters as a list node
        return new ParametersListNode(this.peek(), parameters);
    }

    private parameter(args: Args): ParameterNode {
        const token = this.peek();

        let variadic = false, mutable = false;

        // Check for ellipsis token (variadic parameter)
        if (this.match(TokenType.Ellipsis)) {
            variadic = true;
        }

        if (this.match(TokenType.Mut)) {
            mutable = true;
        }

        // Parse the identifier (parameter name)
        const identifier = this.identifier(args);
        let data_type = null;

        const has_colon = this.match(TokenType.Colon);

        if (!has_colon && !args.ignore_type) {
            this.error(
                ErrorCodes.parser.MISSING_TYPE_ANNOTATION,
                `Parameter '${identifier.name}' requires type annotation.`,
                `A type annotation is required after the parameter name, indicating its type.`,
                `Found token: '${this.peek().value}' instead of a colon ':'`,
                [":"],
                "'param: num'"
            );
        }

        if (has_colon || !args.ignore_type) {
            data_type = this.type(args);
        }

        return new ParameterNode(
            token,
            identifier,
            variadic,
            mutable,
            data_type
        );
    }

    private for_statement(args: Args): ForNode {
        const token = this.peek();
        // Check for the 'for' keyword
        if (!this.match(TokenType.For)) {
            this.error(
                ErrorCodes.parser.MISSING_FOR_KEYWORD,
                "Expected keyword 'for' to start a for loop.",
                "Ensure you're starting the loop with the 'for' keyword.",
                `Found token: '${this.peek().value}' instead of 'for'.`,
                ["'for'"],
                "'for (let var in 1..5) { ... }'"
            );
        }

        const variable = this.identifier(args);

        if (!this.match(TokenType.In)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected 'in' after the variable in the for loop."
            );
        }

        const expression = this.expression({
            ...args,
            skip_struct_init: true
        });

        // Parse the body of the while loop
        const body = this.block(args);

        // If the body is a block, name it "While"
        if (body instanceof BlockNode) {
            body.name = "While";
        }

        return new ForNode(token, variable, expression, body);
    }

    // "while" expression statement
    private while_statement(args: Args): WhileNode {
        const token = this.peek();
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

        if (this.check(TokenType.Let)) {
            this.backtrack(); // return to while
            return this.while_let_statement(args);
        }

        // Parse the loop expression
        let expression = this.expression({
            ...args,
            skip_struct_init: true
        });

        // Parse the body of the while loop
        const body = this.block(args);

        // If the body is a block, name it "While"
        if (body instanceof BlockNode) {
            body.name = "While";
        }

        // Return the constructed WhileNode
        return new WhileNode(token, expression, body);
    }

    private loop_statement(args: Args): WhileNode {
        const token = this.peek();
        // Check for the 'loop' keyword
        if (!this.match(TokenType.Loop)) {
            this.error(
                ErrorCodes.parser.MISSING_WHILE_KEYWORD,
                "Expected keyword 'while' to start a while loop.",
                "Ensure you're starting the loop with the 'while' keyword.",
                `Found token: '${this.peek().value}' instead of 'while'.`,
                ["'while'"],
                "'loop { ... }'"
            );
        }

        // Parse the loop expression
        let expression = new BooleanNode(token, true);

        // Parse the body of the while loop
        const body = this.block(args);

        // If the body is a block, name it "While"
        if (body instanceof BlockNode) {
            body.name = "Loop";
        }

        // Return the constructed WhileNode
        return new WhileNode(token, expression, body);
    }

    private while_let_statement(args: Args): WhileLetNode {
        const token = this.peek();
        // Check for the 'while' keyword
        if (!this.match(TokenType.While)) {
            this.error(
                ErrorCodes.parser.MISSING_WHILE_KEYWORD,
                "Expected keyword 'while' to start a while loop.",
                "Ensure you're starting the loop with the 'while' keyword.",
                `Found token: '${this.peek().value}' instead of 'while'.`,
                ["'while'"],
                "'while let pattern = expr { ... }'"
            );
        }

        if (!this.match(TokenType.Let)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'if' to begin if let expression.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const pattern = this.pattern(args);

        if (!pattern) this.error(ErrorCodes.parser.SYNTAX_ERROR, "Empty pattern")

        if (!this.match(TokenType.Equals)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'if' to begin if let expression.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const exppression = this.expression({
            ...args,
            skip_struct_init: true
        });

        // Parse the body of the while loop
        const body = this.block(args);

        // If the body is a block, name it "While"
        if (body instanceof BlockNode) {
            body.name = "WhileLet";
        }

        // Return the constructed WhileNode
        return new WhileLetNode(
            token,
            pattern,
            exppression,
            body
        );
    }

    /*  
        block ::= { statement_list }
        statement_list ::= statement+
    */
    private block(args: Args): BlockNode {
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
            let stmt = this.statement(args);
            body.push(stmt);
        }

        let must_semi: ASTNode[] = [], errors = [];

        for (let i = 0; i < body.length - 1; i++) {
            if (!(
                body[i] instanceof IfElseNode ||
                body[i] instanceof IfLetNode ||
                body[i] instanceof ExpressionStatementNode ||
                body[i] instanceof VariableStatementNode ||
                body[i] instanceof FunctionDecNode ||
                body[i] instanceof MatchNode ||
                body[i] instanceof ForNode ||
                body[i] instanceof YieldNode ||
                body[i] instanceof StructNode ||
                body[i] instanceof ImplNode
            )) {
                must_semi.push(body[i]);
            }
        }

        if (must_semi.length > 1) {
            for (let s of must_semi) {
                const token = Object.assign({
                    line: 1,
                    column: 1,
                    lineStr: ""
                }, s.token);

                const err = new TError({
                    code: ErrorCodes.parser.MISSING_SEMICOLON,
                    reason: "Expected ';' in expression.",
                    line: token.line,
                    column: token.column,
                    lineStr: token.line_str,
                    stage: "parser",
                })

                errors.push(err.message)
            }
        }

        if (errors.length > 1)
            throw new BodyError(errors.join("\n\n"));

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

    private yield_expression(args: Args): YieldNode {
        // Expect the 'yield' keyword
        if (!this.match(TokenType.Yield)) {
            this.error(
                ErrorCodes.parser.MISSING_RETURN_KEYWORD,
                "Expected 'return' keyword to start the return statement.",
                "Ensure that the return statement begins with the 'return' keyword.",
                `Found token: '${this.peek().value}' instead of 'return'.`,
                ["'return'"],
                "'yield value;'"
            );
        }

        // Parse the expression after 'yield'
        const expression = this.expression(args);

        this.yield = true;

        return new YieldNode(this.peek(), expression);
    }

    private return_statement(args: Args): ReturnNode {
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
        const expression = this.expression(args);

        // Expect semicolon after return statement
        if (!this.match(TokenType.SemiColon)) {
            // WILL BITE BACK
            if (args.statement)
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

    private break_statement(args: Args): ASTNode {
        const token = this.peek();
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
            // WILL BITE BACK
            if (args.statement) {
                this.error(
                    ErrorCodes.parser.MISSING_SEMICOLON,
                    "Expected ';' after 'break'.",
                    "Statements must end with a semicolon.",
                    `Found token: '${this.peek().value}' instead of ';'.`,
                    ["';'"],
                    "'break;'"
                );
            }
        }

        return new BreakNode(token);
    }

    private continue_statement(args: Args): ASTNode {
        const token = this.peek();
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
            // WILL BITE BACK
            if (args.statement) {
                this.error(
                    ErrorCodes.parser.MISSING_SEMICOLON,
                    "Expected ';' after 'continue'.",
                    "Statements must end with a semicolon.",
                    `Found token: '${this.peek().value}' instead of ';'.`,
                    ["';'"],
                    "'continue;'"
                );
            }
        }

        return new ContinueNode(token);
    }

    private spawn_expression(args: Args): SpawnNode {
        const token = this.peek();

        if (!this.match(TokenType.Spawn)) {
            this.error(
                'MISSING_SPAWN_KEYWORD',
                "Expected 'spawn' keyword to start a spawn statement.",
                "The 'spawn' statement must start with the keyword 'spawn'.",
                `Found token: '${this.peek().value}' instead of 'spawn'.`,
                ["'spawn'"],
                "'spawn (expression) { ... }'"
            );
        }

        const expression = this.expression(args);

        return new SpawnNode(token, expression);
    }

    // "if" "(" expression ")" statement ("else" statement)?
    private if_expression(args: Args): IfElseNode | IfLetNode {
        const token = this.peek();

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

        if (this.check(TokenType.Let)) {
            this.backtrack()
            return this.if_let_expression(args);
        }

        let condition = this.expression({
            ...args,
            skip_struct_init: true,
            skip_generic: true
        });

        const consequent = this.block(args);

        if (this.match(TokenType.Else)) {
            const alternate = this.block(args);
            return new IfElseNode(token, condition, consequent, alternate);
        }

        return new IfElseNode(token, condition, consequent);
    }

    // variable_statement ::= "let" variable_declaration
    // | "const" variable_declaration
    private variable_statement(args: Args): VariableStatementNode {
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

        return new VariableStatementNode(this.peek(), this.variable({
            ...args,
            constant
        }));
    }

    // variable_declaration ::= ("mut")? identifier (type_annotation)? (initialiser)?
    private variable(args: Args): VariableNode {
        const token = this.peek();
        let mutable = undefined;
        let expression = undefined;

        if (this.match(TokenType.Mut)) {
            if (args.constant) {
                this.error(
                    ErrorCodes.parser.INVALID_MUT_CONST_COMBO,
                    "Cannot use 'mut' with a constant variable.",
                    "Variables declared with 'const' cannot be marked mutable.",
                    `Tried to declare a constant mutable variable: 'const mut ${this.peek().value}'`,
                    ["Remove 'mut' or use 'let' instead of 'const'"],
                    "- const x: num = 5; // valid\n  - let mut x: num = 5; // valid\n  - const mut x: num = 5; // ❌ invalid"
                );
            }

            mutable = true;
        }

        let identifier = this.identifier(args);

        const data_type = this.type_annotation(args);

        if (this.match(TokenType.Equals)) {
            if (args.no_init) {
                this.error(
                    ErrorCodes.parser.SYNTAX_ERROR,
                    "This variable can't be initialized.",
                    "Variables inside constructs like for loops cannot be initialized."
                );
            }
            expression = this.expression({
                ...args,
                statement: false
            });

            if (mutable == undefined) {
                mutable = false;
            }
        }

        return new VariableNode(
            token,
            identifier,
            args.constant,
            mutable == undefined ? true : mutable,
            expression,
            undefined,
            data_type
        );
    }

    // path_identifier ::= identifier  ("::" identifier)*
    private path_identifier(args: Args): PathNode {
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

        return new PathNode(this.peek(), names);
    }

    private identifier(args: Args): IdentifierNode {
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

    private alias(args: Args): AliasNode {
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

        const identifier = this.identifier(args);

        let tp = undefined;

        if (this.match(TokenType.LT)) {
            tp = this.type_parameters(args);

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

        const data_type = this.type(args);

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

        return new AliasNode(this.peek(), identifier, data_type, tp);
    }

    /**
        type_parameters ::= "<" type_parameter ("," type_parameter)* ">"
        type_parameter ::= identifier (":" identifier ("," identifier)*)?
     */
    private type_parameters(args: Args): TypeParameterNode[] {
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
    private type_annotation(args: Args): ASTNode | undefined {
        if (!this.match(TokenType.Colon)) {
            return undefined;
        }

        return this.type(args);
    }

    /**
     * 
    type ::= Type
        | Type < type ("," type)* >
        | "(" type ("," type)* ")"
     */
    public type(args: Args): TypeNode {
        let type: TypeNode | null = null;

        if ((type = this.ft_type(args))) {
            return type;
        } else if ((type = this.other_type(args))) {
            return type;
        }

        this.error(
            ErrorCodes.parser.SYNTAX_ERROR,
            "Syntax error"
        )
    }

    private ft_type(args: Args): TypeNode | null {
        // Check for generic type parameters first: <T, U, V>
        let genericParams: TypeParameterNode[] | undefined = undefined;
        if (this.match(TokenType.LT)) {
            genericParams = this.type_parameters(args);

            if (!this.check(TokenType.GT)) {
                if (!this.match(TokenType.Identifier)) {
                    this.error(
                        ErrorCodes.parser.EXPECTED_IDENTIFIER,
                        "Expected a generic type parameter identifier.",
                        "Generic type parameters must be valid identifiers like 'T', 'U', 'K', 'V'.",
                        `Found token: '${this.peek().value}' instead of an identifier.`,
                        ["identifier"],
                        "'<T>' or '<T, U, V>'"
                    );
                }
            }

            if (!this.match(TokenType.GT)) {
                this.error(
                    ErrorCodes.parser.MISSING_GREATER_THAN,
                    "Expected closing '>' for generic type parameters.",
                    "Make sure all generic type parameter lists are closed with '>'.",
                    `Found token: '${this.peek().value}' instead of '>'`,
                    [">"],
                    "'<T>' or '<T, U>'"
                );
            }
        }

        // Now check for the parameter list
        if (!this.match(TokenType.LeftParen)) {
            // If we parsed generic params but no function follows, this is an error
            if (genericParams) {
                this.error(
                    ErrorCodes.parser.MISSING_LEFT_PAREN,
                    "Expected '(' after generic type parameters.",
                    "Generic function types must have a parameter list following the generic parameters.",
                    `Found token: '${this.peek().value}' instead of '('`,
                    ["("],
                    "'<T>(value: T) -> T'"
                );
            }
            return null; // Not a function type; let caller handle
        }

        let type = "tuple";
        const types: TypeNode[] = [];

        // Parse parameter types
        if (!this.check(TokenType.RightParen)) {
            // Handle optional parameter names
            if (
                this.peek(0).type == TokenType.Identifier &&
                this.peek(1).type == TokenType.Colon
            ) {
                this.advance(); // Skip parameter name
                this.advance(); // Skip colon
            }

            const paramType = this.type(args);
            types.push(paramType);

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.RightParen)) break;

                if (
                    this.peek(0).type == TokenType.Identifier &&
                    this.peek(1).type == TokenType.Colon
                ) {
                    this.advance();
                    this.advance();
                }

                types.push(this.type(args));
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
            types.push(this.type(args));
        }

        const typeNode = new TypeNode(this.peek(), type, types);
        typeNode.genericParams = genericParams;

        return typeNode;
    }

    // Type "<" type ">"
    private other_type(args: Args): TypeNode | null {
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

        const types: TypeNode[] = [];

        if (!this.check(TokenType.GT)) {
            types.push(this.type(args));

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.GT)) break; // Allow trailing comma
                types.push(this.type(args));
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
    private expression_statement(args: Args): ASTNode {
        const token = this.peek();

        const expression = this.expression(args);

        if (this.match(TokenType.SemiColon)) {
            return new ExpressionStatementNode(token, expression);
        }

        return expression;
    }

    /**
    expression ::= range_expression
        | unary_expression assignment_operator expression
     */
    private expression(args: Args): ASTNode {
        const token = this.peek();
        const left = this.range_expression(args);

        if (this.is_assignment_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.expression(args);

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

            return new AssignmentExpressionNode(token, operator, left, right);
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
            case 'IdentifierNode':
                return true;
            case 'PathNode':
                return true;
            case 'MemberExpressionNode':
                return true;
            default:
                return false;
        }
    }

    /*
     * range_expression ::= conditional_expression (range_operator conditional_expression?)?
     * | range_operator conditional_expression?
     */
    private range_expression(args: Args): ASTNode {
        if (this.is_range_operator(this.peek().type)) {
            const operator = this.advance();

            let end: ASTNode | null = null;
            if (!this.is_at_end() && !this.is_assignment_operator(this.peek().type)) {
                end = this.conditional_expression(args);
            }

            return new RangeNode(
                operator,
                null,
                end,
                operator.type === TokenType.IRange
            )
        }

        const start = this.conditional_expression(args);

        if (this.is_range_operator(this.peek().type)) {
            const operator = this.advance();

            let end: ASTNode | null = null;
            if (!this.is_at_end() && !this.is_assignment_operator(this.peek().type)) {
                end = this.conditional_expression(args);
            }

            return new RangeNode(
                operator,
                start,
                end,
                operator.type === TokenType.IRange
            );

        }

        return start;
    }

    private is_range_operator(type: TokenType): boolean {
        return type === TokenType.IRange || // (..=)
            type === TokenType.ERange // (..)
    }

    private conditional_expression(args: Args): ASTNode {
        const condition = this.logical_or_expression(args);

        if (this.match(TokenType.QuestionMark)) {
            const consequent = this.expression(args);

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

            const alternate = this.conditional_expression(args);

            return new TertiaryExpressionNode(
                this.peek(),
                condition,
                consequent,
                alternate
            )
        }

        return condition;
    }

    private logical_or_expression(args: Args): ASTNode {
        let expr = this.logical_and_expression(args);

        while (this.match(TokenType.Or)) {
            const operator = this.previous().value;
            const right = this.logical_and_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private logical_and_expression(args: Args): ASTNode {
        let expr = this.bitwise_or_expression(args);

        while (this.match(TokenType.And)) {
            const operator = this.previous().value;
            const right = this.bitwise_or_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private bitwise_or_expression(args: Args): ASTNode {
        let expr = this.bitwise_xor_expression(args);

        while (this.match(TokenType.Pipe)) {
            const operator = this.previous().value;
            const right = this.bitwise_xor_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }


    private bitwise_xor_expression(args: Args): ASTNode {
        let expr = this.bitwise_and_expression(args);

        while (this.match(TokenType.Caret)) {
            const operator = this.previous().value;
            const right = this.bitwise_and_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private bitwise_and_expression(args: Args): ASTNode {
        let expr = this.equality_expression(args);

        while (this.match(TokenType.Ampersand)) {
            const operator = this.previous().value;
            const right = this.equality_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);
        }

        return expr;
    }

    private equality_expression(args: Args): ASTNode {
        let expr = this.relational_expression(args);

        while (this.is_equality_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.relational_expression(args);

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_equality_operator(type: TokenType): boolean {
        return type === TokenType.IsEqual ||
            type === TokenType.IsNotEqual
    }

    private relational_expression(args: Args): ASTNode {
        let expr = this.shift_expression(args);

        while (this.is_relational_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.shift_expression(args);

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

    private shift_expression(args: Args): ASTNode {
        let expr = this.additive_expression(args);

        while (this.is_shift_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.additive_expression(args);

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_shift_operator(type: TokenType): boolean {
        return type === TokenType.SR || // come back here
            type === TokenType.SL
    }

    private additive_expression(args: Args): ASTNode {
        let expr = this.multiplicative_expression(args);

        while (this.is_additive_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.multiplicative_expression(args);

            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_additive_operator(type: TokenType): boolean {
        return type === TokenType.Plus ||
            type === TokenType.Minus
    }


    private multiplicative_expression(args: Args): ASTNode {
        let expr = this.unary_expression(args);

        while (this.is_multiplicative_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.unary_expression(args);
            expr = new BinaryOpNode(this.peek(), operator, expr, right);

        }

        return expr;
    }

    private is_multiplicative_operator(type: TokenType): boolean {
        return type === TokenType.Multiply ||
            type === TokenType.Divide ||
            type === TokenType.Modulo
    }


    private unary_expression(args: Args): ASTNode {
        const token = this.peek();

        if (this.is_unary_operator(this.peek().type)) {
            const operator = this.advance().value;
            const expr = this.unary_expression(args);
            return new UnaryOpNode(token, operator, expr);
        }
        return this.postfix_expression(args);
    }

    private is_unary_operator(type: TokenType): boolean {
        return type === TokenType.ExclamationMark ||
            type === TokenType.Mut ||
            type === TokenType.Ampersand
    }

    private postfix_expression(args: Args): ASTNode {
        let expr: ASTNode = this.primary_expression(args);

        if (
            expr instanceof IfElseNode ||
            expr instanceof IfLetNode ||
            expr instanceof MatchNode ||
            expr instanceof BlockNode ||
            expr instanceof LambdaNode
        ) {
            return expr;
        }

        while (true) {
            if (this.match(TokenType.LeftBracket)) {
                expr = this.parseArrayAccess(expr, args);
            }
            else if (this.check(TokenType.LT) && this.is_start_generic()) {
                this.match(TokenType.LT);
                expr = this.parseGenericCall(expr, args);
            }
            else if (this.match(TokenType.LeftParen)) {
                expr = this.parseFunctionCall(expr, args);
            }
            else if (this.match(TokenType.Dot)) {
                expr = this.parseMemberAccess(expr);
            }
            else {
                break;
            }
        }

        if (this.is_postfix_operator(this.peek().type)) {
            const operator = this.advance().value;
            return new PostfixOpNode(this.peek(), operator, expr);
        }

        return expr;
    }

    private is_start_generic() {
        let depth = 0;
        let i = 0;
        const maxLookahead = 64; // to prevent runaway parsing

        while (i < maxLookahead) {
            const token = this.peek(i++);

            switch (token.type) {
                case TokenType.LT:
                    depth++;
                    break;
                case TokenType.GT:
                    depth--;
                    if (depth < 0) return false;
                    if (depth === 0) {
                        // Check if next significant token is `(`
                        const next = this.peek(i++);
                        return next.type === TokenType.LeftParen;
                    }
                    break;
                case TokenType.EOF:
                    return false;
                case TokenType.SemiColon:
                case TokenType.Equals:
                case TokenType.RightBrace:
                case TokenType.LeftBrace:
                    return false;
            }
        }

        return false;
    }

    private is_postfix_operator(type: TokenType): boolean {
        return type === TokenType.QuestionMark
    }

    private parseArgumentList(args: Args): ASTNode[] {
        const argsList: ASTNode[] = [];
        const token = this.peek();

        if (!this.check(TokenType.RightParen)) {
            do {
                if (this.match(TokenType.Ellipsis)) {
                    const spreadArg = this.expression(args);
                    argsList.push(new SpreadElementNode(token, spreadArg));
                } else {
                    argsList.push(this.expression(args));
                }
            } while (this.match(TokenType.Comma));
        }

        return argsList;
    }

    private parseArrayAccess(object: ASTNode, args: Args): ASTNode {
        const index = this.expression(args);

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

        return new MemberExpressionNode(this.peek(), object, index, true);
    }

    private parseGenericCall(callee: ASTNode, args: Args): ASTNode {
        const typeParams: ASTNode[] = [];

        do {
            typeParams.push(this.type(args))
        } while (this.match(TokenType.Comma))

        if (!this.match(TokenType.GT)) {
            this.error(
                ErrorCodes.parser.MISSING_GREATER_THAN,
                "Expected '>' after type parameters.",
                "Ensure that you close your type parameters with a closing '>' token.",
                `Found token: '${this.peek().value}' instead of '>'`,
                [">"],
                "'my_function<num>(20)'"
            );
        }

        if (!this.match(TokenType.LeftParen)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_PAREN,
                "Expected '(' after generic function.",
                "Function calls must include parentheses even after specifying generic type arguments.",
                `Found token: '${this.peek().value}'`,
                ["("],
                "'func<str>(\"val\")'"
            );
        }

        const argsList = this.parseArgumentList(args);

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

        return new CallExpressionNode(this.peek(), callee, argsList, typeParams);
    }

    private parseFunctionCall(callee: ASTNode, args: Args): ASTNode {
        const argsList = this.parseArgumentList(args);

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

        return new CallExpressionNode(this.peek(), callee, argsList);
    }

    private parseMemberAccess(object: ASTNode): ASTNode {
        if (!this.match(TokenType.Identifier, TokenType.Number)) {
            this.error(
                ErrorCodes.parser.MISSING_DOT,
                "Expected an identifier/number after '.' in member access.",
                "When using '.' to access an object's property, it must be followed by a valid identifier.",
                `Found token: '${this.peek().value}' instead of an identifier`,
                ["identifier"],
                "'object.property'"
            );
        }

        const property = new IdentifierNode(this.peek(), this.previous().value);
        return new MemberExpressionNode(this.peek(), object, property, false);
    }

    private primary_expression(args: Args): ASTNode {
        const token = this.peek()
        switch (token.type) {
            case TokenType.True:
            case TokenType.False:
            case TokenType.Number:
            case TokenType.String:
            case TokenType.RawString:
                return this.constants(args);
            case TokenType.LeftBracket:
                return this.array(args);
            case TokenType.LeftBrace:
                return this.block(args);
            case TokenType.Spawn:
                return this.spawn_expression(args);
            case TokenType.Yield:
                return this.yield_expression(args);
            case TokenType.Fun:
                return this.lambda_function(args);
            case TokenType.If:
                return this.if_expression(args);
            case TokenType.Match:
                return this.match_expression(args);
            case TokenType.Identifier: {
                let iden: any = this.path_identifier(args);
                if (this.match(TokenType.ExclamationMark)) {
                    if (!this.match(TokenType.LeftParen)) {
                        ErrorCodes.parser.MISSING_LEFT_PAREN,
                            "Expected '(' after macro call.",
                            "Macro calls must include parentheses even after specifying generic type arguments.",
                            `Found token: '${this.peek().value}'`,
                            ["("],
                            "'my_macro!(\"val\")'"
                    }

                    const argsList = this.parseArgumentList(args);

                    if (!this.match(TokenType.RightParen)) {
                        this.error(
                            ErrorCodes.parser.MISSING_RIGHT_PAREN,
                            "Expected ')' after macro call arguments.",
                            "Macro calls require parentheses around their arguments, and all opening '(' must be closed.",
                            `Found token: '${this.peek().value}' instead of ')'`,
                            [")"],
                            "'my_macro!(arg1, arg2)'"
                        );
                    }

                    return new MacroFunctionNode(token, iden, argsList);
                }

                if (iden.name.length == 1) {
                    // legacy support 'map' and 'set'
                    if (iden.name[0] == "Map" || iden.name[0] == "map") {
                        return this.map(args);
                    } else if (iden.name[0] == "Set" || iden.name[0] == "set") {
                        return this.set(args);
                    }

                }

                if (iden.name.length == 1) {
                    iden = new IdentifierNode(token, iden.name[0]);
                }

                if (!args.skip_struct_init && this.peek().type == TokenType.LeftBrace) {
                    const fields = this.struct_initializer(args);

                    return new StructInitNode(token, iden, fields);
                }

                return iden;
            }
            case TokenType.LeftParen: {
                this.advance();

                const exprs = [];

                if (this.check(TokenType.RightParen)) {
                    this.advance();
                    return new UnitNode(token);
                }

                do {
                    exprs.push(this.expression(args))
                } while (this.match(TokenType.Comma));

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

                return new TupleNode(token, exprs);
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

    private constants(args: Args): ASTNode {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
                return this.boolean(args);
            case TokenType.Number:
                return this.number(args);
            case TokenType.RawString:
                return this.raw_string(args);
            case TokenType.String:
                return this.string(args);
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

    private number(args: Args): NumberNode {
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

    private boolean(args: Args): BooleanNode {
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

    private raw_string(args: Args): StringNode {
        if (!this.match(TokenType.RawString)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRING,
                "Expected a string literal.",
                "String literals are enclosed in quotes.",
                `Found token: '${this.peek().value}' instead of a string`,
                ["string"],
                "'hello world'"
            );
        }
        return new StringNode(this.peek(), this.previous().value, true);
    }

    private string(args: Args): StringNode {
        const token = this.peek();
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

        return new StringNode(token, token.value);
    }

    private array(args: Args): ArrayNode {
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
                elements.push(this.conditional_expression(args));
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

    private map(args: Args): ASTNode {
        const token = this.peek();
        const properties: PropertyNode[] = [];

        this.expect(TokenType.LeftBrace, {
            error: ErrorCodes.parser.MISSING_LEFT_BRACE,
            message: "Expected '{' after 'map'.",
            hint: "A map declaration must begin with an opening brace '{' after the 'map' keyword.",
            expected: ["{"],
            example: "map { key: value }"
        });

        while (!this.check(TokenType.RightBrace)) {
            const keyExpr = this.expression(args);
            const isStringKey = keyExpr instanceof StringNode;

            let valueExpr: ASTNode | undefined;
            const hasColon = this.match(TokenType.Colon);

            if (!hasColon && isStringKey) {
                this.error(
                    ErrorCodes.parser.MISSING_COLON,
                    "Expected ':' after string key.",
                    "String keys must be followed by a colon and a value.",
                    `Found token: '${this.peek().value}' instead of ':'.`,
                    [":"],
                    "Example: map { \"key\": value }"
                );
            }

            if (hasColon) {
                valueExpr = this.expression(args);
            }

            const key = this.extractValidKey(keyExpr, hasColon);

            properties.push(new PropertyNode(this.peek(), key, valueExpr));

            if (!this.match(TokenType.Comma)) break;
        }

        this.expect(TokenType.RightBrace, {
            error: ErrorCodes.parser.MISSING_RIGHT_BRACE,
            message: "Expected '}' at the end of map.",
            hint: "Map declarations must end with a closing brace '}'.",
            expected: ["}"],
            example: "map { key: value }"
        });

        return new MapNode(token, properties);
    }

    private extractValidKey(expr: ASTNode, hasColon: boolean): Key {
        if (expr instanceof StringNode) {
            return {
                type: "string",
                value: expr.value
            };
        }

        if (expr instanceof PathNode) {
            if (expr.name.length > 1) {
                this.error(
                    ErrorCodes.parser.MALFORMED_MAP_KEY,
                    "Malformed map key.",
                    "Map keys must be a single identifier.",
                    `Found complex identifier: '${expr.name.join('::')}'.`,
                    [],
                    "Use simple keys like: map { name: value }"
                );
            }
            return {
                type: "string",
                value: expr.name[0]
            };
        }

        if (expr instanceof IdentifierNode) {
            return {
                type: "string",
                value: expr.name
            };
        }

        if (expr instanceof ArrayNode) {
            if (expr.elements.length == 1) {
                return {
                    type: "ast",
                    value: expr.elements[0]
                }
            }
        }

        this.error(
            ErrorCodes.parser.INVALID_MAP_KEY,
            "Invalid map key.",
            "Map keys must be simple identifiers or strings (only if followed by a value).",
            `Found invalid key expression.`,
            [],
            "Example: map { key: value }"
        );
    }

    private set(args: Args): ASTNode {
        const token = this.peek();
        const elements: ASTNode[] = [];

        // Expect the opening brace
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' after 'set'.",
                "A Set declaration must begin with an opening brace '{' after the 'set' keyword.",
                `Found token: '${this.peek().value}' instead of '{'.`,
                ["{"],
                "Example: set { elem1, elem2 }"
            );
        }

        // Parse key-value pairs
        if (!this.check(TokenType.RightBrace)) {
            do {
                const expr = this.expression(args);
                elements.push(expr);
            } while (this.match(TokenType.Comma) && !this.check(TokenType.RightBrace));
        }

        // Expect the closing brace
        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' at the end of set.",
                "Set declarations must end with a closing brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'.`,
                ["}"],
                "Example: set { key: value }"
            );
        }

        return new SetNode(token, elements);
    }

    private if_let_expression(args: Args): IfLetNode {
        const token = this.peek();
        if (!this.match(TokenType.If)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'if' to begin if let expression.",
                "If initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        if (!this.match(TokenType.Let)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'if' to begin if let expression.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const pattern = this.pattern(args);

        if (!pattern) this.error(ErrorCodes.parser.SYNTAX_ERROR, "Empty pattern")

        if (!this.match(TokenType.Equals)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'if' to begin if let expression.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const exppression = this.expression({
            ...args,
            skip_struct_init: true
        });

        const consequent = this.block(args);

        if (this.match(TokenType.Else)) {
            const alternate = this.block(args);
            return new IfLetNode(token, pattern, exppression, consequent, alternate);
        }

        return new IfLetNode(token, pattern, exppression, consequent);
    }

    public match_expression(args: Args): MatchNode {
        const token = this.peek();
        if (!this.match(TokenType.Match)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected 'match' to begin match expression.",
                "Struct initialization requires opening with a curly brace '{'.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'Person {name: \"John\", age: 30}'"
            );
        }

        const expression = this.expression({
            ...args,
            skip_struct_init: true
        });

        const body: MatchArmNode[] = [];

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

        while (!this.check(TokenType.RightBrace) && !this.is_at_end()) {
            body.push(this.match_arm(args));

            if (!this.match(TokenType.Comma)) {
                if (!this.check(TokenType.RightBrace)) {
                    this.error(
                        ErrorCodes.parser.MISSING_COMMA,
                        "Expected ',' after match's arm.",
                        "Enum variants must be separated by commas.",
                        `Found token: '${this.peek().value}' instead of ','`,
                        [","],
                        "'enum Color { Red, Green, Blue }'"
                    );
                }
            }
        }

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

        return new MatchNode(token, expression, body);
    }

    private match_arm(args: Args): MatchArmNode {
        const token = this.peek();
        let pattern = this.pattern(args);

        if (!pattern) this.error(ErrorCodes.parser.SYNTAX_ERROR, "Empty pattern")

        let guardExpr: ASTNode | null = null;
        if (this.match(TokenType.If)) {
            guardExpr = this.expression(args);
        }

        if (!this.match(TokenType.EqArrow)) {
            this.error(
                ErrorCodes.parser.MISSING_EQ_ARROW,
                "Expected '=>' after pattern (and optional guard).",
                "Each match arm must use '=>' between the pattern and result expression.",
                `Found token: '${this.peek().value}' instead of '=>'`,
                ["'=>'"],
                "'1 => \"one\"'"
            );
        }

        let exp_block = this.statement({
            ...args,
            statement: false
        });

        return new MatchArmNode(token, pattern, guardExpr, exp_block)
    }

    private pattern(args: Args): ASTNode | null {
        const token = this.peek();

        switch (token.type) {
            case TokenType.Number:
            case TokenType.String:
            case TokenType.True:
            case TokenType.False:
                return this.constants(args);
            case TokenType.LeftParen: {
                if (this.match(TokenType.LeftParen)) { }
                const patterns = this.pattern_list(args);
                if (!this.match(TokenType.RightParen)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_PAREN,
                        "Missing '('"
                    );
                }
                return new TuplePatternNode(token, patterns)
            }
            case TokenType.Identifier: {
                if (this.peek().value == "_") {
                    this.match(TokenType.Identifier);
                    return new WildcardNode(token)
                }

                const path = this.path_identifier(args);

                if (this.match(TokenType.LeftBrace)) {
                    const field_patterns = this.field_pattern_list(args);

                    if (!this.match(TokenType.RightBrace)) {
                        this.error(
                            ErrorCodes.parser.MISSING_RIGHT_BRACE,
                            "Missing '}'",
                            "Struct patterns must be enclosed in curly braces '{}'.",
                            `Found token: '${this.peek().value}' instead of '}'`,
                            ["'}'"]
                        );
                    }

                    return new StructPatternNode(token, path, field_patterns)
                }

                if (this.match(TokenType.LeftParen)) {
                    const patterns = this.pattern_list(args);
                    if (!this.match(TokenType.RightParen)) {
                        this.error(
                            ErrorCodes.parser.MISSING_RIGHT_PAREN,
                            "Missing '('"
                        );
                    }

                    return new EnumPatternNode(token, path, patterns)
                }

                if (path.name.length == 1) {
                    return new IdentifierNode(token, path.name[0]);
                }

                return new EnumPatternNode(token, path);
            }
        }

        return null;
    }

    private pattern_list(args: Args) {
        const patterns = [];

        do {
            const pattern = this.pattern(args);

            if (pattern)
                patterns.push(pattern)
        } while (this.match(TokenType.Comma));

        return patterns;
    }

    private field_pattern_list(args: Args) {
        const patterns: FieldPatternNode[] = [];

        do {
            const pattern = this.field_pattern(args);

            if (pattern)
                patterns.push(pattern)

        } while (this.match(TokenType.Comma));

        return patterns;
    }

    private field_pattern(args: Args) {
        const token = this.peek();

        const path = this.identifier(args);

        let pattern = undefined;

        if (this.match(TokenType.Colon)) {
            let _pattern = this.pattern(args);

            if (_pattern)
                pattern = _pattern
        }

        return new FieldPatternNode(token, path, pattern);
    }

    private struct_initializer(args: Args) {
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

        const fields = this.struct_fields(args);

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

    private struct_fields(args: Args): StructFieldNode[] {
        const fields: StructFieldNode[] = [];

        if (this.check(TokenType.RightBrace)) {
            return fields;
        }

        while (true) {
            fields.push(this.struct_field(args));

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

    private struct_field(args: Args) {
        const iden = this.identifier(args);
        let expr;

        if (this.match(TokenType.Colon)) {
            expr = this.expression(args)
        }

        return new StructFieldNode(this.peek(), iden, expr)
    }

    private trait(args: Args): ASTNode {
        const token = this.peek();

        if (!this.match(TokenType.Trait)) {
            this.error(
                ErrorCodes.parser.EXPECTED_TRAIT_KEYWORD,
                "Expected 'trait' keyword to begin trait declaration.",
                "Trait declarations must start with the 'trait' keyword.",
                `Found token: '${this.peek().value}' instead of 'trait'`,
                ["trait"],
                "'trait Person { ... }'"
            );
        }

        const iden = this.identifier(args);

        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin trait body.",
                "Trait declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'trait Person { name: string; age: num; }'"
            );
        }

        const body = this.trait_body(args)

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to end trait body.",
                "Trait declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'trait Person { name: string; age: num; }'"
            );
        }

        return new TraitNode(token, iden, body);
    }

    private trait_body(args: Args) {
        const token = this.peek();
        const body: (FunctionDecNode | TraitSigNode)[] = [];

        while (!this.check(TokenType.RightBrace)) {
            let fun = this.function_declaration(args);

            body.push(fun);
        }

        return body;
    }

    private impl(args: Args): ImplNode {
        const token = this.peek();

        if (!this.match(TokenType.Impl)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRUCT_KEYWORD,
                "Expected 'impl' keyword to begin struct declaration.",
                "Struct declarations must start with the 'struct' keyword.",
                `Found token: '${this.peek().value}' instead of 'struct'`,
                ["struct"],
                "'impl Person { ... }'"
            );
        }

        let trait = undefined;
        let type = this.identifier(args);

        if (this.match(TokenType.For)) {
            let temp = this.identifier(args);

            // swap type and trait
            trait = type;
            type = temp;
        }

        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin struct body.",
                "Struct declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'struct Person { name: string; age: num; }'"
            );
        }

        const body = this.impl_body(args)

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close struct body.",
                "Struct declarations must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'struct Person { name: string; age: num; }'"
            );
        }

        return new ImplNode(token, trait, type, body)
    }

    private impl_body(args: Args): Array<FunctionDecNode> {
        const fields: Array<FunctionDecNode> = [];

        while (!this.check(TokenType.RightBrace)) {
            let fun = this.function_declaration(args);

            if (fun instanceof FunctionDecNode) {
                // if (fun.params?.parameters[0].identifier.name == "self") {
                //     fun = new MemberDecNode(this.peek(), fun)
                // }

                fields.push(fun as FunctionDecNode);
            }
        }

        return fields;
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
    private struct_statement(args: Args): StructNode {
        const token = this.peek();
        if (!this.match(TokenType.Struct)) {
            this.error(
                ErrorCodes.parser.EXPECTED_STRUCT_KEYWORD,
                "Expected 'struct' keyword to begin struct declaration.",
                "Struct declarations must start with the 'struct' keyword.",
                `Found token: '${this.peek().value}' instead of 'struct'`,
                ["struct"],
                "'struct Person { name: string; age: num; }'"
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

        if (this.match(TokenType.SemiColon)) {
            return new StructNode(token, name, []);
        }

        let tp: TypeParameterNode[] | undefined = undefined;

        // Parse type parameters if present: "<" type_parameter ("," type_parameter)* ">"
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters(args);

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

        // Parse struct body
        if (!this.match(TokenType.LeftBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_LEFT_BRACE,
                "Expected '{' to begin struct body.",
                "Struct declarations require a body enclosed in curly braces.",
                `Found token: '${this.peek().value}' instead of '{'`,
                ["{"],
                "'struct Person { name: string; age: num; }'"
            );
        }

        let body = this.struct_body(args);

        if (!this.match(TokenType.RightBrace)) {
            this.error(
                ErrorCodes.parser.MISSING_RIGHT_BRACE,
                "Expected '}' to close struct body.",
                "Struct declarations must end with a closing curly brace '}'.",
                `Found token: '${this.peek().value}' instead of '}'`,
                ["}"],
                "'struct Person { name: string; age: num; }'"
            );
        }

        // Optional semicolon after struct declaration
        if (this.match(TokenType.SemiColon)) { }

        return new StructNode(
            token,
            name,
            body,
            false,
            tp,
            args.attributes
        );
    }

    // struct_body ::= (struct_member)*
    private struct_body(args: Args): ASTNode[] {
        const fields: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace) && !this.is_at_end()) {
            const before = this.peek();
            const field = this.field(args);
            fields.push(field);


            if (this.peek() === before) {
                this.error(
                    ErrorCodes.parser.MISSING_COMMA,
                    "Parser did not advance after field.",
                    "Possible infinite loop due to unrecognized or invalid struct member.",
                    `Stuck at token: '${this.peek().value}'`,
                    ["identifier", "mut"],
                    "'name: string,'"
                );
            }
        }

        return fields;
    }

    // struct_field ::= ("mut")? identifier type_annotation ";"
    private field(args: Args): FieldNode {
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

        const identifier = this.identifier(args);

        // Parse the type annotation
        let data_type = this.type_annotation(args);

        // Expect a semicolon after the field declaration
        if (this.match(TokenType.SemiColon)) {

        } else if (this.match(TokenType.Comma)) {

        } else {
            if (!this.check(TokenType.RightBrace)) {
                this.error(
                    ErrorCodes.parser.MISSING_COMMA,
                    "Expected ',' after field declaration.",
                    "Each field declaration in a struct must end with a comma ','.",
                    `Found token: '${this.peek().value}' instead of ','`,
                    [","],
                    "'name: string,'"
                );
            }
        }

        return new FieldNode(this.peek(), identifier, mutable, data_type);
    }

    private enum_statement(args: Args): EnumNode {
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
            tp = this.type_parameters(args);
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

        let body = this.enum_body(args);

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

    private enum_body(args: Args): EnumVariantNode[] {
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
                    this.struct_body(args)
                );

                if (!this.match(TokenType.RightBrace)) {
                    this.error(
                        ErrorCodes.parser.MISSING_RIGHT_BRACE,
                        "Expected '}' to close struct variant.",
                        "Struct variants in enums must be closed with a closing curly brace '}'.",
                        `Found token: '${this.peek().value}' instead of '}'`,
                        ["}"],
                        "'Point { x: num, y: num }'"
                    );
                }
            }
            // Parse tuple variant if present
            else if (this.match(TokenType.LeftParen)) {
                value = new TupleVariantNode(this.peek(), this.tuple_payload(args));

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

    private tuple_payload(args: Args): ASTNode[] {
        const types: ASTNode[] = [];

        do {
            types.push(this.type(args));
        } while (this.match(TokenType.Comma));

        return types;
    }

    /*
    module_statement ::= (export_modifier)? "module" identifier "{" (module_body)? "}"
    module_body ::= (module_item)*
    module_item ::= (export_modifier)? source_element
    export_modifier ::= "export"
    */
    private module_statement(args: Args): ModuleNode {
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

        let identifier = this.identifier(args);

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

        let body = this.module_body(args);

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

    private module_body(args: Args): ASTNode[] {
        const items: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace)) {
            let is_public = false;

            // Check for 'export' keyword
            if (this.match(TokenType.Export)) {
                is_public = true;
            }

            const item = this.source_element(args);

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
    private import(args: Args): ImportNode {
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
        let identifier = this.identifier(args);

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
    private use(args: Args): UseNode {
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
        let path = this.use_path(args);
        let list = undefined, alias = undefined;

        // Check for left brace, indicating a use list
        if (this.match(TokenType.LeftBrace)) {
            list = this.use_list(args);
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

    private use_path(args: Args): UsePathNode {
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

    private use_list(args: Args) {
        const items: UseItemNode[] = [];

        do {
            items.push(this.use_item(args))
        } while (this.match(TokenType.Comma))

        return new UseListNode(this.peek(), items);
    }

    private use_item(args: Args): UseItemNode {
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