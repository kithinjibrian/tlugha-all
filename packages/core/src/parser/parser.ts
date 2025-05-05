import {
    ArrayNode,
    AssignmentExpressionNode,
    ASTNode,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    CallExpressionNode,
    ConstantVariantNode,
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

    private error(message: string): never {
        const token = this.peek();
        throw new Error(`

${token.line_str}
${Array(token.column - 1).fill("~").join("")}^

${message} at line ${token.line}, column ${token.column}
        `);
    }

    /**
     * Program ::= (source_elements)? <EOF>
     */
    public parse(): ASTNode {
        let source = this.source_elements();

        if (this.match(TokenType.EOF)) {
            this.error("Expected 'EOF'");
        }

        return new ProgramNode(source);
    }

    /*
        source_elements ::= (source_element)+
    */
    private source_elements(): ASTNode {
        const sources: ASTNode[] = [];

        while (!this.is_at_end()) {
            sources.push(this.source_element());
        }

        return new SourceElementsNode(sources);
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
                        this.error("Expected ';'");
                    }

                    return node;
                }
        }

        return this.expression_statement();
    }

    // function_declaration ::= "fun" identifier (type_parameters)? "(" (parameter_list)? ")" type_annotation function_body
    private function_declaration(): FunctionDecNode {
        // Expect function name
        if (!this.match(TokenType.Fun)) {
            this.error("Expected 'fun' keyword name");
        }

        const functionName = this.identifier();
        let tp: TypeParameterNode[] | undefined = undefined;

        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            if (!this.match(TokenType.GT)) {
                this.error("Expected token '>'")
            }
        }

        // Expect opening parenthesis
        if (!this.match(TokenType.LeftParen)) {
            this.error("Expected '(' after function name");
        }

        // Parse parameters
        let parameters = this.parameters_list();

        // Expect closing parenthesis
        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')' after parameters");
        }

        let rt: ASTNode;

        if (this.match(TokenType.Colon)) {
            rt = this.type();
        } else {
            this.error(`Function '${functionName.name}' requires a return type annotation`);
        }

        let body = this.block();

        body.name = `fn_body_${functionName.name}`

        return new FunctionDecNode(
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

    private lambda_function() {
        // Expect function name
        if (!this.match(TokenType.Fun)) {
            this.error("Expected 'fun' keyword name");
        }

        let tp: TypeParameterNode[] | undefined = undefined;

        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            if (!this.match(TokenType.GT)) {
                this.error("Expected token '>'")
            }
        }

        // Expect opening parenthesis
        if (!this.match(TokenType.LeftParen)) {
            this.error("Expected '(' after function name");
        }

        // Parse parameters
        let parameters = this.parameters_list();

        // Expect closing parenthesis
        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')' after parameters");
        }

        let rt: ASTNode | undefined = undefined;

        if (this.match(TokenType.Colon)) {
            rt = this.type();
        }

        let body;
        if (this.match(TokenType.Arrow)) {

            if (this.check(TokenType.LeftBrace))
                body = this.block();
            else
                body = this.expression()
        }
        else
            this.error("Expected token -> for lambda functions");

        return new LambdaNode(
            parameters,
            body,
            false,
            tp,
            rt
        );
    }

    private parameters_list(): ParametersListNode | undefined {

        if (this.peek().type == TokenType.RightParen) {
            return undefined;
        }

        let seen_variadic = false;
        const parameters = [];

        do {
            if (seen_variadic)
                this.error(`Variadic parameter should be the last parameter in a function`);

            const n = this.parameter();

            if (n.variadic)
                seen_variadic = true;

            parameters.push(n);
        } while (this.match(TokenType.Comma));

        return new ParametersListNode(parameters);
    }

    private parameter(): ParameterNode {
        let variadic = false;

        if (this.match(TokenType.Ellipsis)) {
            variadic = true;
        }

        const identifier = this.identifier();

        if (!this.match(TokenType.Colon)) {
            this.error(`Parameter '${identifier.name}' requires type annotation.`)
        }

        const data_type = this.type()

        return new ParameterNode(
            identifier,
            variadic,
            data_type
        );
    }

    // "while" "(" expression ")" statement
    private while_statement(): WhileNode {
        if (!this.match(TokenType.While)) {
            this.error("Expected keyword 'while'")
        }


        // Expect opening parenthesis
        if (!this.match(TokenType.LeftParen)) {
            this.error("Expected '(' before expression");
        }

        // Parse expression
        let expression = this.expression()

        // Expect closing parenthesis
        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')' after expression");
        }

        const body = this.statement();

        if (body instanceof BlockNode) {
            body.name = "While"
        }

        return new WhileNode(expression, body);
    }

    /*  
        block ::= { statement_list }
        statement_list ::= statement+
    */
    private block(): BlockNode {
        const body: ASTNode[] = [];

        // Expect opening brace
        if (!this.match(TokenType.LeftBrace)) {
            this.error("Expected '{' before body");
        }

        while (!this.check(TokenType.RightBrace) && !this.is_at_end()) {
            body.push(this.statement());
        }

        // Expect closing brace
        if (!this.match(TokenType.RightBrace)) {
            this.error("Expected '}' before body");
        }

        return new BlockNode(body);
    }

    private return_statement(): ReturnNode {
        if (!this.match(TokenType.Return)) {
            this.error("Expected 'return'");
        }

        if (this.match(TokenType.SemiColon)) {
            return new ReturnNode();
        }

        const expression = this.expression();

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';' after return statement");
        }

        return new ReturnNode(expression);
    }

    private break_statement(): ASTNode {
        if (!this.match(TokenType.Break)) {
            this.error("Expected 'break'");
        }

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';' after break");
        }

        return {
            type: "Break",
            accept(visitor) {
                return visitor.visitBreak?.(this);
            }
        }
    }

    private continue_statement(): ASTNode {
        if (!this.match(TokenType.Continue)) {
            this.error("Expected 'continue'");
        }

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';' after continue");
        }

        return {
            type: "Continue",
            accept(visitor) {
                return visitor.visitContinue?.(this);
            }
        }
    }

    // "if" "(" expression ")" statement ("else" statement)?
    private if_statement(): IfElseNode {
        if (!this.match(TokenType.If)) {
            this.error("Expected keyword 'if'")
        }

        // Expect opening parenthesis
        if (!this.match(TokenType.LeftParen)) {
            this.error("Expected '(' before expression");
        }

        // Parse condition
        let condition = this.expression()

        // Expect closing parenthesis
        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')' after expression");
        }

        const consequent = this.statement();

        if (this.match(TokenType.Else)) {
            const alternate = this.statement();

            return new IfElseNode(condition, consequent, alternate);
        }

        return new IfElseNode(condition, consequent);
    }

    // variable_statement ::= "let" variable_declaration ";"
    // | "const" variable_declaration ";"
    private variable_statement(): VariableStatementNode {
        let constant = false;

        if (!this.match(TokenType.Let)) {
            if (this.match(TokenType.Const)) {
                constant = true;
            } else {
                this.error("Expected 'let'");
            }
        }

        return new VariableStatementNode(this.variable(constant));
    }

    // variable_declaration ::= ("mut")? identifier (type_annotation)? (initialiser)?
    private variable(constant: boolean = false): VariableNode {
        let mutable = false;
        let expression = undefined;

        if (this.match(TokenType.Mut)) {
            if (constant) {
                this.error(`Can't mutate const variable '${this.identifier().name}'.`)
            }
            mutable = true;
        }

        let identifier = this.identifier();
        const data_type = this.type_annotation()

        if (this.match(TokenType.Equals)) {
            expression = this.assignment_expression();
        }

        return new VariableNode(
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
            this.error("Expected an identifer");
        }

        const names = [this.previous().value];

        while (this.match(TokenType.Scope)) {
            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifer");
            }

            names.push(this.previous().value);
        }

        return new ScopedIdentifierNode(names);
    }

    private identifier(): IdentifierNode {
        if (!this.match(TokenType.Identifier)) {
            this.error("Expected an identifer");
        }

        const name = this.previous().value;

        return new IdentifierNode(name);
    }

    private alias(): AliasNode {
        if (!this.match(TokenType.Type)) {
            this.error("Expected 'type' keyword name");
        }

        let identifier = this.identifier();

        if (!this.match(TokenType.Equals)) {
            this.error("Expected token '='");
        }

        let data_type = this.type();

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';'");
        }

        return new AliasNode(identifier, data_type);
    }

    /**
        type_parameters ::= "<" type_parameter ("," type_parameter)* ">"
        type_parameter ::= identifier (":" identifier ("," identifier)*)?
     */
    private type_parameters(): TypeParameterNode[] {
        const params: TypeParameterNode[] = [];
        do {
            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifier.")
            }

            const name = this.previous().value;

            let constraints: string[] = [];
            if (this.match(TokenType.Colon)) {
                do {
                    if (!this.match(TokenType.Identifier)) {
                        this.error("Expected an identifier");
                    }

                    constraints.push(this.previous().value);

                } while (this.match(TokenType.Plus))
            }

            params.push(new TypeParameterNode(name, constraints));
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
            accept() { }
        };
    }

    private ft_type(): ASTNode | null {
        if (!this.match(TokenType.LeftParen)) {
            return null;
        }

        let type = "tuple";
        const types: ASTNode[] = [];

        if (!this.check(TokenType.RightParen)) {
            types.push(this.type());

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.RightParen)) break; // trailing comma
                types.push(this.type());
            }
        }

        if (!this.match(TokenType.RightParen)) {
            this.error("Expected ')'");
        }

        if (this.match(TokenType.Arrow)) {
            type = "->";
            types.push(this.type());
        }

        return new TypeNode(type, types);
    }

    // Type "<" type ">"
    private other_type(): ASTNode | null {
        if (!this.match(TokenType.Identifier)) {
            this.error("Expected an identifier");
        }

        const value = this.previous().value;

        if (!this.match(TokenType.LT)) {
            return new TypeNode(value);
        }

        const types: ASTNode[] = [];

        if (!this.check(TokenType.GT)) {
            types.push(this.type());

            while (this.match(TokenType.Comma)) {
                if (this.check(TokenType.GT)) break; // trailing comma
                types.push(this.type());
            }
        }

        if (!this.match(TokenType.GT)) {
            this.error("Expected '>'");
        }

        return new TypeNode(value, types);
    }

    // expression_statement::= expression ";"
    private expression_statement(): ExpressionStatementNode {
        const expression = this.expression();

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';' after expression");
        }

        return new ExpressionStatementNode(expression);
    }

    // expression ::= assignment_expression ("," assignment_expression)*
    private expression(): ASTNode {
        const expr = this.assignment_expression();

        if (this.match(TokenType.Comma)) {
            const expressions = [expr];

            do {
                expressions.push(this.assignment_expression());
            } while (this.match(TokenType.Comma));

            return new ExpressionNode(expressions);
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
                this.error('Invalid assignment target');
            }

            return new AssignmentExpressionNode(operator, left, right);

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
        const condition = this.logical_or_expression()

        if (this.match(TokenType.QuestionMark)) {
            const consequent = this.expression();

            if (!this.match(TokenType.Colon)) {
                this.error("Expected ':' in conditional expression");
            }

            const alternate = this.conditional_expression();

            return {
                type: 'TertiaryExpression',
                condition,
                consequent,
                alternate,
                accept(visitor) {
                    return visitor.visitTertiaryExpression?.(this)
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
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private logical_and_expression(): ASTNode {
        let expr = this.bitwise_or_expression();

        while (this.match(TokenType.And)) {
            const operator = this.previous().value;
            const right = this.bitwise_or_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private bitwise_or_expression(): ASTNode {
        let expr = this.bitwise_xor_expression();

        while (this.match(TokenType.Pipe)) {
            const operator = this.previous().value;
            const right = this.bitwise_xor_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }


    private bitwise_xor_expression(): ASTNode {
        let expr = this.bitwise_and_expression();

        while (this.match(TokenType.Caret)) {
            const operator = this.previous().value;
            const right = this.bitwise_and_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private bitwise_and_expression(): ASTNode {
        let expr = this.equality_expression();

        while (this.match(TokenType.Ampersand)) {
            const operator = this.previous().value;
            const right = this.equality_expression();
            expr = new BinaryOpNode(operator, expr, right);
        }

        return expr;
    }

    private equality_expression(): ASTNode {
        let expr = this.relational_expression();

        while (this.is_equality_operator(this.peek().type)) {
            const operator = this.advance().value;
            const right = this.relational_expression();

            expr = new BinaryOpNode(operator, expr, right);

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

            expr = new BinaryOpNode(operator, expr, right);
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

            expr = new BinaryOpNode(operator, expr, right);

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

            expr = new BinaryOpNode(operator, expr, right);

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
            expr = new BinaryOpNode(operator, expr, right);

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
                // Array access: expr[index]
                const index = this.expression();
                if (!this.match(TokenType.RightBracket)) {
                    this.error("Expected ']' after array index");
                }
                expr = new MemberExpressionNode(expr, index, true);
            }
            else if (this.match(TokenType.LeftParen)) {
                // Function call: expr(args)
                const args: ASTNode[] = [];
                if (!this.check(TokenType.RightParen)) {
                    do {
                        args.push(this.assignment_expression());
                    } while (this.match(TokenType.Comma));
                }

                if (!this.match(TokenType.RightParen)) {
                    this.error("Expected ')' after function arguments");
                }

                expr = new CallExpressionNode(expr, args);
            }
            else if (this.match(TokenType.Dot)) {
                // Member access: expr.id
                if (!this.match(TokenType.Identifier)) {
                    this.error("Expected identifier after '.'");
                }

                expr = new MemberExpressionNode(
                    expr,
                    new IdentifierNode(this.previous().value),
                    false
                )
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
                    return new StructInitNode(iden, fields);
                }

                return iden;
            }
            case TokenType.LeftParen:
                {
                    this.advance();
                    const expr = this.expression();
                    if (!this.match(TokenType.RightParen)) {
                        this.error("Expected ')' after expression.")
                    }

                    if (expr instanceof ExpressionNode) {
                        return new TupleNode(expr.expressions)
                    }

                    return expr;
                }
        }

        return this.error('Unknown');
    }

    private constants() {
        switch (this.peek().type) {
            case TokenType.True:
            case TokenType.False:
                return this.boolean();
            case TokenType.Number:
                return this.number();
            case TokenType.String:
                return this.string();
        }

        this.error('Unknown');
    }

    private number(): NumberNode {
        if (!this.match(TokenType.Number)) {
            this.error("Expected a number");
        }

        return new NumberNode(+this.previous().value);
    }

    private boolean(): BooleanNode {
        if (!this.match(TokenType.True) && !this.match(TokenType.False)) {
            this.error(`Expected a boolean`);
        }

        return new BooleanNode(this.previous().type == TokenType.True);
    }

    private string(): StringNode {
        if (!this.match(TokenType.String)) {
            this.error("Expected a string");
        }

        return new StringNode(this.previous().value);
    }

    private array(): ArrayNode {
        const elements: ASTNode[] = [];

        if (!this.match(TokenType.LeftBracket)) {
            this.error("Expected a '['");
        }

        if (!this.check(TokenType.RightBracket)) {
            do {
                elements.push(this.conditional_expression());
            } while (this.match(TokenType.Comma));
        }

        if (!this.match(TokenType.RightBracket)) {
            this.error("Expected a ']'");
        }

        return new ArrayNode(elements);
    }

    private map_or_set(): ASTNode {
        const elements: ASTNode[] = [];
        const properties: PropertyNode[] = [];
        let is_ds: "none" | "set" | "map" = "none";

        if (!this.match(TokenType.LeftBrace)) {
            this.error("Expected a '{'");
        }

        if (!this.check(TokenType.RightBrace)) {
            do {
                let keyExpr = this.assignment_expression();

                if (this.match(TokenType.Colon)) {
                    if (is_ds == "set") {
                        this.error("Cannot mix key-value pairs and standalone values in a map or set");
                    }

                    is_ds = "map";

                    const valueExpr = this.assignment_expression();

                    if (keyExpr instanceof StringNode) {
                        properties.push(new PropertyNode(keyExpr.value, valueExpr));
                    } else if (keyExpr instanceof ScopedIdentifierNode) {
                        properties.push(new PropertyNode(keyExpr.name[0], valueExpr));
                    }
                } else {
                    if (is_ds == "map") {
                        this.error("Cannot mix key-value pairs and standalone values in a map or set");
                    }

                    is_ds = "set";
                    elements.push(keyExpr);
                }
            } while (this.match(TokenType.Comma) && !this.check(TokenType.RightBrace));
        }

        if (!this.match(TokenType.RightBrace)) {
            this.error("Expected a '}'");
        }

        return is_ds == "none" ? new MapNode([]) : is_ds == "map"
            ? new MapNode(properties) : new SetNode(elements);
    }

    private struct_initializer() {
        if (!this.match(TokenType.LeftBrace)) {
            this.error("Expected a '{'");
        }

        const fields = this.struct_fields();

        if (!this.match(TokenType.RightBrace)) {
            this.error("Expected a '}'");
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

        return new StructFieldNode(iden, expr)
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
            this.error(`Expected token 'struct'`);
        }

        const name = this.peek().value;
        this.advance();

        let tp: TypeParameterNode[] | undefined = undefined;

        // type_parameters ::= "<" type_parameter ("," type_parameter)* ">"
        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            if (!this.match(TokenType.GT)) {
                this.error(`Expected token '>'`);
            }
        }

        // ("impl" trait_impl ("," trait_impl)*)?
        if (this.match(TokenType.Impl)) {

        }

        if (!this.match(TokenType.LeftBrace)) {
            this.error(`Expected token '{'`)
        }

        let body = this.struct_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(`Expected token '}'`)
        }

        if (this.match(TokenType.SemiColon)) { }

        return new StructNode(name, body, false, tp);
    }

    // struct_body ::= (struct_member)*
    private struct_body(): ASTNode[] {
        const fields: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace)) {

            if (this.check(TokenType.Fun)) {
                let fun = this.function_declaration();

                if (fun.params?.parameters[0].identifier.name == "self") {
                    fun = new MemberDecNode(fun)
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

        const identifier = this.identifier();
        let data_type = this.type_annotation();

        if (!this.match(TokenType.SemiColon)) {
            this.error(`Expected ';' after field declaration`);
        }

        return new FieldNode(identifier, mutable, data_type);
    }

    private enum_statement(): EnumNode {
        if (!this.match(TokenType.Enum)) {
            this.error(`Expected token 'enum'`);
        }

        const name = this.peek().value;
        this.advance();

        let tp: TypeParameterNode[] | undefined = undefined;

        if (this.match(TokenType.LT)) {
            tp = this.type_parameters();

            if (!this.match(TokenType.GT)) {
                this.error(`Expected token '>'`);
            }
        }

        if (!this.match(TokenType.LeftBrace)) {
            this.error(`Expected token '{'`)
        }

        let body = this.enum_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(`Expected token '}'`)
        }

        if (this.match(TokenType.SemiColon)) { }

        return new EnumNode(name, body, false, tp);
    }

    private enum_body(): EnumVariantNode[] {
        const variants: EnumVariantNode[] = [];

        while (!this.check(TokenType.RightBrace)) {
            if (!this.match(TokenType.Identifier)) {
                this.error(`Expected an identifier`);
            }

            const name = this.previous().value;

            let value: EnumVariantValueNode | undefined = undefined;

            if (this.match(TokenType.LeftBrace)) {
                value = new StructNode(
                    name,
                    this.struct_body()
                );

                if (!this.match(TokenType.RightBrace)) {
                    this.error(`Expected '}' to close struct variant`);
                }

            } else if (this.match(TokenType.LeftParen)) {
                value = new TupleVariantNode(this.tuple_payload());

                if (!this.match(TokenType.RightParen)) {
                    this.error(`Expected ')' to close tuple variant`);
                }
            }

            variants.push(new EnumVariantNode(name, value));

            if (!this.match(TokenType.Comma)) {
                if (!this.check(TokenType.RightBrace)) {
                    this.error(`Expected ',' after enum variant`);
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
        if (!this.match(TokenType.Module)) {
            this.error("Expected keyword 'module'");
        }

        let identifer = this.identifier();

        if (!this.match(TokenType.LeftBrace)) {
            this.error(`Expected token '{'`)
        }

        let body = this.module_body();

        if (!this.match(TokenType.RightBrace)) {
            this.error(`Expected token '}'`)
        }

        return new ModuleNode(identifer, body);
    }

    private module_body() {
        const items: ASTNode[] = [];

        while (!this.check(TokenType.RightBrace)) {
            let is_public = false;
            if (this.match(TokenType.Export)) {
                is_public = true;
            }

            const item = this.source_element();

            if (is_public) {
                if (item instanceof StructNode ||
                    item instanceof FunctionDecNode ||
                    item instanceof EnumNode
                ) {
                    item.exported = true;
                } else {
                    this.error(`Node '${item.type}' can't be exported`);
                }
            }

            items.push(item);
        }

        return items;
    }

    // import_statement ::= "import" identifier ";"
    private import(): ImportNode {
        if (!this.match(TokenType.Import)) {
            this.error("Expected keyword 'import'");
        }

        let identifer = this.identifier();

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';'");
        }

        return new ImportNode(identifer);
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
        if (!this.match(TokenType.Use)) {
            this.error("Expected keyword 'use'");
        }

        let path = this.use_path();
        let list = undefined, alias = undefined;

        if (this.match(TokenType.LeftBrace)) {
            list = this.use_list();
            if (!this.match(TokenType.RightBrace)) {
                this.error("Expected token '}'")
            }
        } else if (this.match(TokenType.As)) {
            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifier");
            }

            alias = this.previous().value
        }

        if (!this.match(TokenType.SemiColon)) {
            this.error("Expected ';'");
        }

        return new UseNode(path, list, alias);
    }

    private use_path(): UsePathNode {
        const path = [];

        do {
            if (this.check(TokenType.LeftBrace))
                break;

            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifer");
            }

            path.push(this.previous().value);

        } while (this.match(TokenType.Scope))

        return new UsePathNode(path);
    }

    private use_list() {
        const items: UseItemNode[] = [];

        do {
            items.push(this.use_item())
        } while (this.match(TokenType.Comma))

        return new UseListNode(items);
    }

    private use_item(): UseItemNode {
        if (!this.match(TokenType.Identifier)) {
            this.error("Expected an identifer");
        }

        let name = this.previous().value;
        let alias = undefined;

        if (this.match(TokenType.As)) {
            if (!this.match(TokenType.Identifier)) {
                this.error("Expected an identifer");
            }

            alias = this.previous().value;
        }

        return new UseItemNode(name, alias)
    }
}