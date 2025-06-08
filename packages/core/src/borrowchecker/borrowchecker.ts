import {
    ActiveBorrow,
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    BorrowFrame,
    CallExpressionNode,
    ErrorCodes,
    ExpressionStatementNode,
    ExtensionStore,
    FunctionDecNode,
    Lifetime,
    Module,
    ProgramNode,
    ScopedIdentifierNode,
    SourceElementsNode,
    TError,
    UnaryOpNode,
    VariableNode,
    VariableStatementNode
} from "../types";

export class BorrowChecker implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance("borrowchecker");
    public errors: string[] = [];

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public lugha: Function,
        public ast?: ASTNode
    ) {
    }

    public error(
        ast: ASTNode | null,
        code: string,
        reason: string,
        hint?: string,
        context?: string,
        expected?: string[],
        example?: string
    ): void {
        let token = {
            line: 1,
            column: 1,
            line_str: ""
        };

        if (ast && ast.token) {
            token = ast.token;
        }

        const pointer = ' '.repeat(token.column - 1) + '^';

        const message =
            `${this.file ? `File: ${this.file}` : ''}
[Borrowchecker:${code}] ${reason}
--> line ${token.line}, column ${token.column}
${token.line_str}
${pointer}
${expected ? `Expected: ${expected.join(', ')}` : ''}
${hint ? `Hint: ${hint}` : ''}
${context ? `Context: ${context}` : ''}
${example ? `Example: ${example}` : ''}`;

        this.errors.push(message);
    }

    private cleanup_frame(frame: BorrowFrame) {
        for (const [name, node] of frame.symbol_table.entries()) {
            if (node instanceof VariableNode) {
                console.log(node);
            }
        }
    }

    public async before_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        //  console.log(node.type)
        for (const ext of this.extension.get_extensions()) {
            await ext.before_accept?.(node, this, args)
        }
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<any | undefined> {
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

    async run() {
        if (this.ast) {
            await this.visit(this.ast, { frame: this.root.frame, module: this.root });
        }

        if (this.errors.length > 0) {
            throw new Error(`Borrow errors found:\n${this.errors.join('\n\n')}`);
        }

        return this;
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

    async visitExpressionStatement(node: ExpressionStatementNode, args?: Record<string, any>) {
        await this.visit(node.expression, args);
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        const new_frame = new BorrowFrame(frame, node.identifier.name);

        await this.visit(node.body, { frame: new_frame, module });

        this.cleanup_frame(new_frame);
    }

    async visitBlock(
        node: BlockNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        const new_frame = new BorrowFrame(frame, "block");

        for (const stmt of node.body) {
            await this.visit(stmt, { frame: new_frame, module });
        }

        this.cleanup_frame(new_frame);
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        for (const arg of node.args) {
            await this.visit(arg, { frame, module });
        }
    }

    async visitVariableList(
        node: VariableStatementNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.variables, args);
    }

    async visitVariable(
        node: VariableNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        frame.define(node.identifier.name, node);

        node.owner_lifetime.startNode = node;

        if (node.expression) {
            const rhs = await this.visit(node.expression, { frame, module });

            if (rhs instanceof VariableNode) {
                if (rhs.active_borrows.length == 0) {
                    if (rhs.moved) {
                        this.error(
                            node,
                            ErrorCodes.borrow_checker.MOVE_ERROR,
                            `Use of moved value: '${rhs.identifier.name}'`,
                            "You cannot use a variable after it has been moved.",
                            `Moved variable '${rhs.identifier.name}' cannot be accessed again.`,
                            ["value not moved"],
                            `let x = [1, 2, 3];\nlet y = x;\nlet z = x; // ❌ ${ErrorCodes.borrow_checker.MOVE_ERROR}`
                        );
                    } else {
                        rhs.moved = true;
                        rhs.active_borrows = [];
                    }
                }
            }
        }
    }

    async visitAssignmentExpression(
        node: BinaryOpNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        await this.visit(node.right, { frame, module });

        let left;
        if (node.left instanceof ScopedIdentifierNode) {
            left = await this.getScopedSymbol(node.left, { frame, module });

            if (left instanceof VariableNode) {
                if (!left.mutable) {
                    this.error(
                        node,
                        ErrorCodes.borrow_checker.IMMUTABLE_REASSIGNMENT,
                        `Cannot assign twice to immutable variable '${left.identifier.name}'.`,
                        "Declare the variable as mutable using 'let mut' if reassignment is needed.",
                        `Attempting to reassign to '${left.identifier.name}', which is not declared as mutable.`,
                        ["mutable variable"],
                        `let x = 10;\nx = 20; // ❌ ${ErrorCodes.borrow_checker.IMMUTABLE_REASSIGNMENT}`
                    );
                }

                if (left.active_borrows.length > 0) {
                    this.error(
                        node,
                        ErrorCodes.borrow_checker.ASSIGN_TO_BORROWED,
                        `Cannot assign to '${left.identifier.name}' because it is borrowed.`,
                        "Wait for all borrows to go out of scope before reassigning.",
                        `Variable '${left.identifier.name}' has active borrows preventing assignment.`,
                        ["no active borrows"],
                        `let mut x = 10;\nlet r = &x;\nx = 20; // ❌ ${ErrorCodes.borrow_checker.ASSIGN_TO_BORROWED}`
                    );
                }

                if (left.moved) {
                    this.error(
                        node,
                        ErrorCodes.borrow_checker.USE_AFTER_MOVE,
                        `Use of moved value: '${left.identifier.name}'`,
                        "Cannot assign to a variable that has been moved.",
                        `Variable '${left.identifier.name}' was moved and cannot be assigned to.`,
                        ["non-moved variable"],
                        `let x = [1];\nlet y = x;\nx = [2]; // ❌ ${ErrorCodes.borrow_checker.USE_AFTER_MOVE}`
                    );
                }

                left.moved = false;
            }
        }
    }

    async getScopedSymbol(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: BorrowFrame; module: Module }
    ) {
        const __p = (search_frame: BorrowFrame, name: string) => {
            const symbol = search_frame.get(name);

            if (!symbol) {
                this.error(
                    node,
                    ErrorCodes.name_res.UNDEFINED_SYMBOL,
                    `Symbol '${name}' is not defined.`,
                    "You may have a typo or used a symbol before declaring it.",
                    `Symbol '${name}' was not found in the current scope.`,
                    ["defined variable or function"],
                    `Valid: let ${name} = 42; let a = ${name} + 10; invalid: let sum = w + 10; Symbol 'w' is not defined.`
                );
            }

            return symbol;
        };

        let current: Module | undefined;

        if (node.name.length === 1) {
            return __p(frame, node.name[0]);
        }
    }

    async visitScopedIdentifier(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        // everything is an object so its all move semantics alone
        const symbol = await this.getScopedSymbol(node, { frame, module });
        if (symbol instanceof VariableNode) {
            if (symbol.moved) {
                this.error(
                    node,
                    ErrorCodes.borrow_checker.USE_AFTER_MOVE,
                    `Use of moved value: '${symbol.identifier.name}'`,
                    "You cannot use a variable after its value has been moved.",
                    `The value previously owned by '${symbol.identifier.name}' has been moved and is no longer accessible through this variable.`,
                    ["value not moved"],
                    `let x = obj();\nlet y = x;\nlet z = x; // ❌ ${ErrorCodes.borrow_checker.USE_AFTER_MOVE}`
                );
                return symbol;
            }
        }

        return symbol;
    }

    async visitUnaryOp(
        node: UnaryOpNode,
        { frame, module }: { frame: BorrowFrame, module: Module }
    ) {
        const symbol = await this.visit(node.operand, { frame, module });

        if (
            symbol instanceof VariableNode &&
            node.operand instanceof ScopedIdentifierNode
        ) {
            switch (node.operator) {
                case "&": {
                    const hasMutableBorrow = symbol.active_borrows.some(
                        (b) => b.type === 'mutable'
                    );

                    if (hasMutableBorrow) {
                        this.error(
                            node,
                            ErrorCodes.borrow_checker.IMMUTABLE_AND_MUTABLE_BORROW,
                            `Cannot borrow '${symbol.identifier.name}' as immutable because it is already borrowed as mutable.`,
                            "You must end the mutable borrow before borrowing it immutably again.",
                            `Borrowing '${symbol.identifier.name}' as '&' while it's already borrowed as '&mut'.`,
                            ["immutable borrow"],
                            `let mut x = 5;\nlet y = &mut x;\nlet z = &x; // ❌ ${ErrorCodes.borrow_checker.IMMUTABLE_AND_MUTABLE_BORROW}`
                        );
                        return symbol;

                    }

                    const newSharedLifetime = new Lifetime(node);

                    const newSharedBorrow = new ActiveBorrow(
                        'shared',
                        node.operand,
                        newSharedLifetime
                    );

                    symbol.active_borrows.push(newSharedBorrow);

                    node.operand.borrowed_ref_into = newSharedBorrow;

                    symbol.moved = false;

                    return symbol;
                }
                case "mut": {
                    if (symbol.active_borrows.length > 0) {
                        this.error(
                            node,
                            ErrorCodes.borrow_checker.MULTIPLE_MUTABLE_BORROWS,
                            `Cannot borrow '${symbol.identifier.name}' as mutable because it is already borrowed.`,
                            "You must wait for all immutable borrows to go out of scope before taking a mutable borrow.",
                            `Trying to borrow '${symbol.identifier.name}' as '&mut' while it is already borrowed.`,
                            ["mutable borrow"],
                            `let mut x = 10;\nlet r1 = &x;\nlet r2 = &mut x; // ❌ ${ErrorCodes.borrow_checker.MULTIPLE_MUTABLE_BORROWS}`
                        );
                        return symbol;
                    }

                    if (!symbol.mutable) {
                        this.error(
                            node,
                            ErrorCodes.borrow_checker.MUTABLE_BORROW_OF_IMMUTABLE,
                            `Cannot borrow '${symbol.identifier.name}' as mutable, as it is not declared as mutable.`,
                            "Declare the variable as mutable using 'let mut'.",
                            `Attempting to create mutable borrow of immutable variable '${symbol.identifier.name}'.`,
                            ["mutable variable"],
                            `let x = 10;\nlet y = &mut x; // ❌ ${ErrorCodes.borrow_checker.MUTABLE_BORROW_OF_IMMUTABLE}`
                        );
                        return symbol;
                    }

                    const newSharedLifetime = new Lifetime(node);

                    const newSharedBorrow = new ActiveBorrow(
                        'mutable',
                        node.operand,
                        newSharedLifetime
                    );

                    symbol.active_borrows.push(newSharedBorrow);

                    node.operand.borrowed_ref_into = newSharedBorrow;

                    symbol.moved = false;

                    return symbol;
                }
                default:
                    break;
            }
        }


        return symbol;
    }
}