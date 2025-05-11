import { ErrorCodes, TError } from "../error/error";
import { Panic } from "../error/panic";
import { EnumType } from "../objects/enum";
import { RangeType } from "../objects/range";
import {
    ArrayNode,
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    CallExpressionNode,
    EnumModule,
    EnumNode,
    EnumPatternNode,
    EnumVariantNode,
    ExpressionStatementNode,
    FieldNode,
    ForNode,
    FunctionDecNode,
    IdentifierNode,
    IfElseNode,
    IfLetNode,
    ImplNode,
    LambdaNode,
    MapNode,
    MatchNode,
    MemberDecNode,
    MemberExpressionNode,
    ModuleNode,
    NumberNode,
    ParameterNode,
    ProgramNode,
    RangeNode,
    result,
    ReturnNode,
    ScopedIdentifierNode,
    SetNode,
    SourceElementsNode,
    SpreadElementNode,
    StringNode,
    StructAlreadyInitNode,
    StructInitNode,
    StructModule,
    StructNode,
    TaggedNode,
    TupleNode,
    TupleVariantNode,
    UnitType,
    UseNode,
    VariableNode,
    VariableStatementNode,
    WhileNode,
    WildcardNode
} from "../types";

import { Frame, Module } from "../types";
import { ArrayType } from "../types";
import { Type } from "../types";
import { FunctionType } from "../types";
import { LambdaType } from "../types";
import { MapType } from "../types";
import { NumberType } from "../types";
import { SetType } from "../types";
import { StringType } from "../types";
import { TupleType } from "../types";
import { ExtensionStore } from "../types";

import { create_object } from "../types";
import { BoolType } from "../types";
import { StructType } from "../types";
import { MemberType } from "../types";

import {
    builtin,
} from "../types"

export class Engine implements ASTVisitor {
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance();
    private enum: number = 0;

    constructor(
        public rd: string,
        public wd: string,
        public ast: ASTNode | null,
        public root: Module,
        public lugha: Function
    ) { }

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

    public async before_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
        // console.log(node.type)
        for (const ext of this.extension.get_extensions()) {
            await ext.before_accept?.(node, this, args)
        }
    }

    public async visit(node?: ASTNode, args?: Record<string, any>): Promise<void> {
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
                await node.accept(this, args);
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

    public async execute_function(
        fn: FunctionDecNode | LambdaNode,
        args: Type<any>[],
        frame: Frame
    ) {
        const name = fn instanceof FunctionDecNode ? fn.identifier.name : "lambda";

        // parent is captured env
        const new_frame = new Frame(fn.frame, `fn_${name}`);

        if (fn.params) {
            fn.params.parameters.forEach((param, i) => {
                let _param: ParameterNode = param;

                let value = undefined;

                if (_param.variadic) {
                    const rest = [];

                    for (let y = i; y < args.length; y++) {
                        rest.push(args[y]);
                    }

                    value = new TupleType(rest)
                } else if (i < args.length) {
                    value = args[i];
                }

                new_frame.define(
                    _param.identifier.name, new ParameterNode(
                        _param.token,
                        _param.identifier,
                        _param.variadic,
                        _param.data_type,
                        _param.expression,
                        value,
                    ))
            });
        }

        if (fn instanceof FunctionDecNode && fn.inbuilt) {
            const name = fn.identifier.name;
            const inbuilt = builtin[name];

            if (inbuilt.type != "function") {
                this.error(
                    fn,
                    ErrorCodes.runtime.NOT_CALLABLE,
                    `Object '${name}' is not callable.`,
                    "You attempted to call something that is not a function or callable object.",
                    `The object '${name}' was used with '()' but does not support being invoked.`,
                    ["function", "callable object"],
                    `Example: let f = () -> {}; f();`
                );
            }

            const filtered = inbuilt.filter
                ? inbuilt.filter(args)
                : args.map(i => i.getValue());

            if (inbuilt.has_callback) {
                filtered.unshift(this);
            }

            let value;
            if (inbuilt.async) {
                try {
                    value = new EnumType("Ok",
                        new TupleType([
                            create_object(await inbuilt.exec(filtered))
                        ])
                    )
                } catch (e: any) {
                    value = new EnumType("Err",
                        new TupleType([
                            new StringType(e.message)
                        ])
                    )
                }
            } else {
                try {
                    value = new EnumType("Ok",
                        new TupleType([
                            create_object(inbuilt.exec(filtered))
                        ])
                    )
                } catch (e: any) {
                    if (e instanceof Panic) {
                        throw e;
                    }

                    value = new EnumType("Err",
                        new TupleType([
                            new StringType(e.message)
                        ])
                    )
                }
            }

            if (value !== undefined && value !== null)
                frame.stack.push(value)
        } else {

            await this.visit(fn.body, { frame: new_frame, module: fn.module })

            if (!new_frame.return_value && new_frame.stack.length > 0) {
                frame.stack.push(new_frame.stack.pop());
                return;
            }

            if (new_frame.return_value)
                frame.stack.push(new_frame.return_value);
        }
    }

    async run() {
        for (const ext of this.extension.get_extensions()) {
            for (const fn of ext.before_run?.()) {
                await fn({
                    root: this.root
                })
            }
        }

        if (this.ast)
            await this.visit(this.ast, { frame: this.root.frame, module: this.root });

        return this;
    }

    async call_main() {
        let main = this.root.frame.get("main");

        if (main) {
            await this.execute_function(main, [], this.root.frame);
            let ret = this.root.frame.stack.pop();

            let after = [];

            for (const ext of this.extension.get_extensions()) {
                let val = await ext?.after_main?.({
                    root: this.root
                });

                if (val) after.push(val);
            }

            if (ret || after.length > 0) {
                const value = ret?.getValue();
                return after.length > 0 ? [value, ...after] : value;
            }

            return null;
        }

        this.error(
            null,
            ErrorCodes.runtime.MISSING_MAIN,
            "Main function not found.",
            "Program execution requires a 'main' function as the entry point.",
            "No symbol named 'main' was found in the root frame.",
            ["main function"],
            "Example: fun main() { print('Hello'); }"
        );
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
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        frame.stack.pop();
        frame.stack.push(new UnitType());
    }

    async visitModule(
        node: ModuleNode,
        { frame, module, ...rest }: { frame: Frame, module: Module, rest: any[] }
    ) {
        const new_module = new Module(node.identifier.name)
        module.add_submodule(new_module);

        for (const src of node.body) {
            await this.visit(src, {
                ...rest,
                module: new_module,
                frame: new_module.frame,
            });
        }
    }

    async visitUse(
        node: UseNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const self = this;
        function resolveModule(path: string[]): Module | undefined {
            let mod, start = 1;
            if (path[0] == "super") {
                if (module.parent) {
                    start = 2;
                    mod = module.parent.children.find(m => m.name === path[1]);
                }
            } else
                mod = self.root.children.find(m => m.name === path[0]);

            if (!mod) {
                self.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Module '${path[0]}' is not defined.`,
                    "Tried to access a module that doesn't exist in the root scope.",
                    `No top-level module named '${path[0]}' was found.`,
                    ["defined module"]
                );

                throw new Error("");
            }

            for (let i = start; i < path.length; i++) {
                mod = mod.children.find(m => m.name === path[i]);
                if (!mod) {
                    self.error(
                        node,
                        ErrorCodes.runtime.UNDEFINED_MODULE,
                        `Module path '${path.slice(0, i + 1).join("::")}' is not defined.`,
                        "Nested module does not exist in the specified path.",
                        `Failed at '${path[i]}' in path '${path.join("::")}'.`,
                        ["existing module path"]
                    );

                    throw new Error("");
                }
            }
            return mod;
        }

        if (node.list) {
            const mod = resolveModule(node.path.path);
            if (!mod) return;

            node.list.items.forEach(item => {
                const symbol = mod.frame.get(item.name);

                if (
                    !symbol ||
                    symbol instanceof StructNode
                ) {
                    mod.children.forEach(m => {
                        if (m.name == item.name) {
                            module.add_submodule(m)
                        }
                    })

                    return;
                }

                frame.define(item.alias ?? item.name, symbol);
            });
        } else {
            const path = node.path.path;
            const mod = resolveModule(path.slice(0, -1));
            if (!mod) return;

            const symbol = mod.frame.get(path[path.length - 1]);

            if (!symbol) {
                mod.children.forEach(m => {
                    if (m.name == path[path.length - 1]) {
                        module.add_submodule(m)
                    }
                })

                return;
            }

            frame.define(node.alias ?? path[path.length - 1], symbol);
        }
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        node.frame = frame;
        node.module = module;
        frame.define(node.identifier.name, node);
    }

    async visitLambda(
        node: LambdaNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        node.frame = frame;
        node.module = module;
        frame.stack.push(new LambdaType(node));
    }

    async visitBlock(
        node: BlockNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const new_frame = new Frame(frame, node.name);

        for (const n of node.body) {
            await this.visit(n, { frame: new_frame, module });


            if (
                new_frame.return_flag ||
                new_frame.break_flag ||
                new_frame.continue_flag
            ) {
                break;
            }
        }


        if (!new_frame.return_flag && new_frame.stack.length > 0) {
            const last_value = new_frame.stack[new_frame.stack.length - 1];
            frame.stack.push(last_value);
        }

        frame.continue_flag = new_frame.continue_flag;
        frame.break_flag = new_frame.break_flag;
        frame.return_flag = new_frame.return_flag;
        frame.return_value = new_frame.return_value;
    }

    async visitSpreadElement(
        node: SpreadElementNode,
        { frame, module }: { frame: Frame; module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        const spread = frame.stack.pop();

        for (const value of spread) {
            frame.stack.push(value);
        }
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { frame, module }: { frame: Frame; module: Module }
    ) {
        const evaluatedArgs: Type<any>[] = [];

        for (const arg of node.args) {
            await this.visit(arg, { frame, module });
            const argValue = frame.stack.pop();
            if (!argValue) {
                this.error(
                    node,
                    ErrorCodes.runtime.STACK_UNDERFLOW,
                    "Stack underflow during argument evaluation.",
                    "An argument was evaluated, but no result was pushed onto the stack.",
                    "Stack did not contain expected value after evaluating an argument.",
                    ["evaluated value"],
                    "Example: print('{}', 1 + 2)"
                );
            }
            evaluatedArgs.push(argValue);
        }

        if (node.callee instanceof ScopedIdentifierNode) {
            await this.visit(node.callee, { frame, module });
            const nd = frame.stack.pop();

            if (!nd) {
                this.error(
                    node.callee,
                    ErrorCodes.runtime.UNDEFINED_FUNCTION,
                    `Function '${node.callee.name.join('.')}' is not defined.`,
                    "The function you're trying to call has not been declared or imported.",
                    `Function '${node.callee.name.join('.')}' not found in scope.`,
                    ["defined function", "imported symbol"],
                    `Example: fun greet() { ... } \ngreet();`
                );
            }

            if (
                nd instanceof FunctionType ||
                nd instanceof LambdaType
            ) {
                await this.execute_function(nd.getValue(), evaluatedArgs, frame);
            } else if (nd instanceof TaggedNode) {
                const _enum = new EnumType(nd.name, new TupleType(evaluatedArgs), nd.members);
                frame.stack.push(_enum);
            } else {
                this.error(
                    node,
                    ErrorCodes.runtime.NOT_CALLABLE,
                    `Object '${node.callee.name.join('.')}' is not callable.`,
                    "You tried to call a value that isn't a function or lambda.",
                    "The symbol exists but cannot be invoked with '()'.",
                    ["function", "lambda"],
                    "Example: let f = (): number -> 1; f();"
                );
            }

        } else {
            await this.visit(node.callee, { frame, module, args: evaluatedArgs });
            const fn = frame.stack.pop();

            if (!(
                fn instanceof FunctionType ||
                fn instanceof LambdaType ||
                fn instanceof MemberType
            )) {
                this.error(
                    node,
                    ErrorCodes.runtime.NOT_CALLABLE,
                    "Attempted to call a non-function value.",
                    "Only functions or lambda expressions can be called with '()'.",
                    `Type '${fn?.constructor?.name ?? "unknown"}' is not callable.`,
                    ["function", "lambda"],
                    "Example: fun (x): number -> x * 2"
                );
            }

            await this.execute_function(fn.getValue(), evaluatedArgs, frame);
        }
    }

    async get_object(
        node: MemberExpressionNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.object, { frame, module });
        const object = frame.stack.pop() as Type<any>;

        let propertyValue: Type<any>;
        if (node.computed) {
            await this.visit(node.property, { frame, module });
            propertyValue = frame.stack.pop() as Type<any>;
        } else {
            let name = (node.property as IdentifierNode).name;
            propertyValue = new StringType(name);
        }

        return {
            object,
            property: propertyValue
        }
    }

    async visitMemberExpression(
        node: MemberExpressionNode,
        { frame, module, args }: { frame: Frame, module: Module, args: Type<any>[] }
    ) {
        const { object, property } = await this.get_object(node, { frame, module });

        const value = await object.get({
            engine: this,
            frame,
            module
        }, property, args);

        if (!value) {
            this.error(
                node,
                ErrorCodes.runtime.UNDEFINED_PROPERTY,
                `Property '${property}' not found on object.`,
                "You're trying to access a property or method that doesn't exist on this object.",
                `The property '${property}' is not defined on the target object.`,
                ["valid property", "defined method"],
                `obj.prop or obj.method()`
            );
        }

        frame.stack.push(value);
    }

    async visitVariableList(
        node: VariableStatementNode,
        args?: Record<string, any>
    ) {
        await this.visit(node.variables, args);
    }

    async visitVariable(
        node: VariableNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let value: Type<any> | null = null;

        if (node.expression) {
            await this.visit(node.expression, { frame, module });
            value = frame.stack.pop() as Type<any>;
        }

        if (value?.getType() == "function") {
            frame.define(node.identifier.name, value.getValue());
        } else {
            node.value = value;
            frame.define(node.identifier.name, node);
        }

    }

    async visitIfElse(
        node: IfElseNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.condition, { frame, module });
        const condition = frame.stack.pop() as Type<any>;


        if (condition.getValue()) {
            await this.visit(node.consequent, { frame, module });
        } else {
            await this.visit(node.alternate, { frame, module });
        }
    }

    async visitAssignmentExpression(
        node: BinaryOpNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let left, object = null, property = null;

        if (node.left instanceof MemberExpressionNode) {
            const o = await this.get_object(node.left, { frame, module });

            object = o.object;
            property = o.property;

            const value = await object.get({
                engine: this,
                frame,
                module
            }, property, []);
            if (!value) {
                this.error(
                    node.left,
                    ErrorCodes.runtime.UNDEFINED_PROPERTY,
                    `Property '${property}' not found on object.`,
                    "Cannot assign to an undefined property.",
                    `Object has no property named '${property}'.`,
                    ["defined property"],
                    "obj.field = 42"
                );
            }

            left = { value };
        } else {
            left = this.getScopedSymbol(node.left as ScopedIdentifierNode, { frame, module });
            if (!left) {
                this.error(
                    node.left,
                    ErrorCodes.runtime.UNDEFINED_VARIABLE,
                    "Cannot assign to undefined variable.",
                    "The left-hand side of the assignment is not a declared variable.",
                    `Variable '${(node.left as ScopedIdentifierNode).name.join('.')}' not found.`,
                    ["declared variable"],
                    "valid: let x = 1; x = 2; invalid: let x = 1; y = 2; y is an undefined variable."
                );
            }
        }

        await this.visit(node.right, { frame, module });
        const right = frame.stack.pop();
        if (!right) {
            this.error(
                node.right,
                ErrorCodes.runtime.STACK_UNDERFLOW,
                "Stack underflow during assignment.",
                "The right-hand side of the assignment did not produce a value.",
                "Missing value for assignment.",
                ["evaluated expression"],
                "valid: x = 1 + 2"
            );
        }

        let result: Type<any>;
        try {
            switch (node.operator) {
                case "+=":
                    result = left.value.add(right);
                    break;
                case "-=":
                    result = left.value.minus(right);
                    break;
                case "*=":
                    result = left.value.multiply(right);
                    break;
                case "/=":
                    result = left.value.divide(right);
                    break;
                case "%=":
                    result = left.value.modulo(right);
                    break;
                case "=":
                    result = right;
                    break;
                default:
                    this.error(
                        node,
                        ErrorCodes.runtime.UNSUPPORTED_OPERATOR,
                        `Unsupported operator '${node.operator}' in assignment.`,
                        "This assignment operator is not recognized or allowed.",
                        `Operator '${node.operator}' is invalid in this context.`,
                        ["=", "+=", "-=", "*=", "/=", "%="],
                        "x += 1"
                    );
            }
        } catch (e: any) {
            this.error(
                node,
                ErrorCodes.runtime.OPERATION_FAILED,
                `Operation failed during '${node.operator}' assignment.`,
                e.message,
                "A runtime error occurred while computing the new value.",
                ["valid operands"],
                "x += 1"
            );
        }

        if (object && property) {
            object.set(property, result);
        } else {
            left.value = result;
        }

        frame.stack.push(result);
    }

    async visitRangeExpression(
        node: RangeNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let start: any = null;
        let end: any = null;

        if (node.start) {
            await this.visit(node.start, { frame, module });
            start = frame.stack.pop();
        } else {
            start = new NumberType(0);
        }

        if (node.end) {
            await this.visit(node.end, { frame, module });
            end = frame.stack.pop();
        } else {
            end = new NumberType(Infinity);
        }

        if (start instanceof NumberType && end instanceof NumberType) {
            const range = new RangeType(start, end, node.is_inclusive);
            frame.stack.push(range);
        }
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.left, { frame, module });
        const left = frame.stack.pop();
        if (!left) {
            this.error(
                node.left,
                ErrorCodes.runtime.STACK_UNDERFLOW,
                "Stack underflow while evaluating left operand.",
                "The left-hand side expression did not leave a value on the stack.",
                "Likely due to a missing or failed evaluation of the left operand.",
                ["evaluated expression"],
                "x + 5"
            );
        }

        await this.visit(node.right, { frame, module });
        const right = frame.stack.pop();
        if (!right) {
            this.error(
                node.right,
                ErrorCodes.runtime.STACK_UNDERFLOW,
                "Stack underflow while evaluating right operand.",
                "The right-hand side expression did not leave a value on the stack.",
                "Likely due to a missing or failed evaluation of the right operand.",
                ["evaluated expression"],
                "x + 5"
            );
        }

        let result: Type<any>;
        switch (node.operator) {
            case "+":
                result = left.add(right);
                break;
            case "-":
                result = left.minus(right);
                break;
            case "*":
                result = left.multiply(right);
                break;
            case "/":
                result = left.divide(right);
                break;
            case "%":
                result = left.modulo(right);
                break;
            case "<":
                result = left.lt(right);
                break;
            case "<=":
                result = left.lte(right);
                break;
            case ">":
                result = left.gt(right);
                break;
            case ">=":
                result = left.gte(right);
                break;
            case "==":
                result = left.eq(right);
                break;
            case "!=":
                result = left.neq(right);
                break;
            case "&&":
                result = left.and(right);
                break;
            case "||":
                result = left.or(right);
                break;
            default:
                this.error(
                    node,
                    ErrorCodes.runtime.UNSUPPORTED_OPERATOR,
                    `Unsupported operator '${node.operator}' in assignment.`,
                    "This assignment operator is not recognized or allowed.",
                    `Operator '${node.operator}' is invalid in this context.`,
                    ["+", "-", "*", "/", "%", "<", ">", "==", "!=", "&&", "||"],
                    "let a = x + 1;"
                );
        }

        frame.stack.push(result);
    }

    getScopedSymbol(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: Frame; module: Module }
    ) {
        const __p = (search_frame: Frame, name: string) => {
            const symbol = search_frame.get(name);

            if (!symbol) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_SYMBOL,
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

        const rootToken = node.name[0];
        if (rootToken === "root") {
            current = this.root;
        } else if (rootToken === "self") {
            current = module;
        } else if (rootToken === "super") {
            if (!module.parent) {
                this.error(
                    node,
                    ErrorCodes.runtime.INVALID_SUPER_REFERENCE,
                    "Cannot use 'super' at the root module.",
                    "'super' refers to a parent module, which doesn't exist at the root level.",
                    "Tried to access parent of the root module.",
                    ["self", "root", "or specific module name"],
                    "'use super::graphics;' in a submodule"
                );
            }
            current = module.parent;
        } else {
            current = module.children.find(m => m.name === rootToken);
            if (!current) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Undefined module: '${rootToken}'`,
                    `The module '${rootToken}' does not exist.`,
                    `Available modules: ${module.children.map(m => `'${m.name}'`).join(", ") || "none"}`,
                    ["existing module name"]
                );
            }
        }

        for (let i = 1; i < node.name.length - 1; i++) {
            const next = node.name[i];
            if (current) {
                current = current.children.find(m => m.name === next);
            }

            if (!current) {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Undefined submodule: '${next}'`,
                    `The submodule '${next}' does not exist in '${node.name[i - 1]}'.`,
                    "Tried to traverse a non-existent submodule path.",
                    ["existing submodule"],
                    "use graphics::shapes::Circle;"
                );
            }
        }

        if (current?.frame) {
            return __p(current.frame, node.name[node.name.length - 1]);
        }

        this.error(
            node,
            ErrorCodes.runtime.UNDEFINED_SYMBOL,
            `Symbol '${node.name[node.name.length - 1]}' is not defined in the target module.`,
            "The symbol you tried to access does not exist or is not visible in this module.",
            "Final symbol lookup failed.",
            ["existing symbol"]
        );
    }

    async visitScopedIdentifier(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const symbol = this.getScopedSymbol(node, { frame, module });

        if (symbol instanceof VariableNode ||
            symbol instanceof ParameterNode
        ) {
            frame.stack.push(symbol.value);
        } else if (symbol instanceof StructNode) {
            frame.stack.push(symbol);
        } else if (symbol instanceof TaggedNode) {
            if (symbol.body instanceof NumberNode) {
                await this.visit(symbol.body, { frame, module });
                frame.stack.push(new EnumType(symbol.name, frame.stack.pop(), symbol.members))
                return;
            } else if (symbol.body instanceof StructNode) {
                frame.stack.push(symbol.body)
                return;
            }

            frame.stack.push(symbol);
        } else if (symbol instanceof Type) {
            frame.stack.push(symbol);
        } else if (symbol instanceof FunctionDecNode) {
            frame.stack.push(new FunctionType(symbol));
        } else if (symbol instanceof LambdaNode) {
            frame.stack.push(new LambdaType(symbol))
        }
    }

    async visitIdentifier(
        node: IdentifierNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const symbol = frame.get(node.name);

        if (!symbol) {
            const mod = module.children.find(n => n.name == node.name);
            if (mod) {
                frame.stack.push(mod);
            }
        }

        if (symbol instanceof VariableNode ||
            symbol instanceof ParameterNode
        ) {
            frame.stack.push(symbol.value);
        } else if (symbol instanceof StructNode) {
            frame.stack.push(symbol);
        }
    }

    async visitFor(
        node: ForNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        let expression = frame.stack.pop() as Type<any>;

        for (const value of expression) {
            const new_frame = new Frame(frame);

            node.variable.variables.value = value;

            new_frame.define(
                node.variable.variables.identifier.name,
                node.variable.variables
            );

            await this.visit(node.body, {
                frame: new_frame,
                module,
                name: "for"
            });

            if (new_frame.break_flag) {
                frame.break_flag = false;
                break;
            }

            if (new_frame.continue_flag) {
                frame.break_flag = false;
                break;
            }

            if (new_frame.return_flag) {
                frame.return_flag = new_frame.return_flag;
                frame.return_value = new_frame.return_value
                break;
            }
        }

    }

    async visitWhile(
        node: WhileNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        let condition = frame.stack.pop() as Type<any>;

        while (condition.getValue()) {
            await this.visit(node.body, { frame, module, name: "while" });
            await this.visit(node.expression, { frame, module });

            if (frame.break_flag) {
                frame.break_flag = false;
                break;
            }

            if (frame.continue_flag) {
                frame.continue_flag = false;
                await this.visit(node.expression, { frame, module });
                condition = frame.stack.pop() as Type<any>;
                continue;
            }

            if (frame.return_flag) {
                break;
            }

            condition = frame.stack.pop() as Type<any>;
        }
    }

    async visitReturn(
        node: ReturnNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        if (node.expression) {
            await this.visit(node.expression, { frame, module });
            frame.return_value = frame.stack.pop() as Type<any>;
        }

        frame.return_flag = true;
    }

    async visitBreak(
        node: ASTNode,
        { frame }: { frame: Frame }
    ) {
        frame.break_flag = true;
    }

    async visitContinue(node: ASTNode, { frame }: { frame: Frame }) {
        frame.continue_flag = true;
    }

    async visitEnum(
        node: EnumNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const newModule = new EnumModule(node.name);
        const newFrame = newModule.frame;
        module.add_submodule(newModule);

        let enum_counter = 0;

        for (const src of node.body) {
            await this.visit(src, { frame: newFrame, enum_counter });

            if (!src.value)
                enum_counter++
        }
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { frame, module, enum_counter }: { frame: Frame, module: Module, enum_counter: number }
    ) {
        let variant = node.value ?? new NumberNode(null, enum_counter);
        frame.define(node.name, new TaggedNode(null, node.name, variant));
    }

    async visitImpl(
        node: ImplNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.iden, { frame, module });
        const obj = frame.stack.pop();

        if (obj instanceof StructNode) {
            await this.visitImplStruct(node, obj, { frame, module });
        } else if (obj instanceof EnumModule) {
            await this.visitImplEnum(node, obj, { frame, module });
        }
    }

    async visitImplStruct(
        impl_node: ImplNode,
        struct_node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        // should revisit. members should capture impl environ
        const struct_mod = struct_node.module

        for (const src of impl_node.body) {
            if (src instanceof FunctionDecNode && !(src instanceof MemberDecNode)) {
                src.frame = struct_mod.frame;
                src.module = struct_mod;
                struct_mod.frame.define(src.identifier.name, src);
            } else if (src instanceof MemberDecNode) {
                src.frame = struct_mod.frame;
                src.module = module;
            }

            struct_node.body.map(n => {
                if (n instanceof FieldNode) {
                    return n.field.name
                } else if (n instanceof FunctionDecNode) {
                    return n.identifier.name
                }
            })
                .map(name => {
                    if (name == src.identifier.name) {
                        this.error(
                            src,
                            "DUPLICATE_FIELDS",
                            `A field with this name already exist in struct ${struct_node.name}`
                        )
                    }
                })

            struct_node.body.push(src)
        }
    }

    async visitImplEnum(
        impl_node: ImplNode,
        enum_mod: EnumModule,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        for (let [key, value] of enum_mod.frame.symbol_table.entries()) {
            if (value instanceof TaggedNode) {
                for (const src of impl_node.body) {
                    src.frame = frame;
                    src.module = module;

                    const duplicate = value.members.some(
                        v => v.identifier.name === src.identifier.name
                    );

                    if (duplicate) {
                        this.error(
                            src,
                            "DUPLICATE_FIELDS",
                            `A field with this name already exists in struct ${value.name}`
                        );
                    }

                    if (src instanceof MemberDecNode) {
                        value.members.push(src);
                    }
                }
            }
        }

        for (const src of impl_node.body) {
            if (src instanceof FunctionDecNode && !(src instanceof MemberDecNode)) {
                enum_mod.frame.define(src.identifier.name, src);
            }
        }
    }

    async visitStruct(
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const newModule = new StructModule(node.name, frame);
        node.module = newModule;

        frame.define(node.name, node);

        module.add_submodule(newModule);
    }

    async visitStructAlreadyInit(
        node: StructAlreadyInitNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        frame.stack.push(node.struct);
    }

    async visitStructInit(
        node: StructInitNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.name, { frame, module });

        const struct = frame.stack.pop() as StructNode;

        const providedFields: Record<string, any> = {};

        for (const { iden, expression } of node.fields) {
            await this.visit(expression ?? iden, { frame, module });
            providedFields[iden.name] = frame.stack.pop();
        }

        const instance: Record<string, any> = {};

        for (const member of struct.body) {
            if (member instanceof FieldNode) {
                const fieldName = member.field.name;

                if (!(fieldName in providedFields)) {
                    this.error(
                        node,
                        ErrorCodes.runtime.MISSING_STRUCT_FIELD,
                        `Missing field '${fieldName}' in struct initialization.`,
                        "All required fields of a struct must be provided during initialization.",
                        `The field '${fieldName}' is declared in the struct but wasn't provided.`,
                        [`field '${fieldName}'`],
                        `${struct.name} { ${fieldName}: value }`
                    );
                }

                instance[fieldName] = providedFields[fieldName];
            } else if (member instanceof MemberDecNode) {
                const methodName = member.identifier.name;
                instance[methodName] = new MemberType(member);
            }
        }

        frame.stack.push(new StructType(instance, struct.name));
    }


    async visitIfLet(
        node: IfLetNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        const value = frame.stack.pop() as Type<any>;

        const matches = await this.matchPattern(node.pattern, value, { frame, module });

        if (matches) {
            await this.visit(node.consequent, { frame, module })
        } else {
            if (node.alternate) {
                await this.visit(node.alternate, { frame, module })
            }
        }
    }

    async visitMatch(
        node: MatchNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.expression, { frame, module });
        const value = frame.stack.pop() as Type<any>;

        for (const arm of node.arms) {
            const new_frame = new Frame(frame);

            const matches = await this.matchPattern(arm.pattern, value, { frame: new_frame, module });

            if (!matches) continue;

            await this.visit(arm.exp_block, { frame: new_frame, module });

            frame.continue_flag = new_frame.continue_flag;
            frame.break_flag = new_frame.break_flag;
            frame.return_flag = new_frame.return_flag;
            frame.return_value = new_frame.return_value;

            if (new_frame.return_value) {
                frame.stack.push(new_frame.return_value);
            } else {
                const ret = new_frame.stack.pop();

                if (ret)
                    frame.stack.push(ret);
            }

            return;
        }
    }

    private async matchPattern(
        pattern: ASTNode,
        value: Type<any>,
        { frame, module }: { frame: Frame, module: Module }
    ): Promise<boolean> {
        if (
            pattern instanceof NumberNode ||
            pattern instanceof StringNode ||
            pattern instanceof ScopedIdentifierNode
        ) {
            await this.visit(pattern, { frame, module });
            const res = frame.stack.pop() as Type<any>;

            return res.eq(value).getValue();
        }

        if (pattern instanceof EnumPatternNode) {
            await this.visit(pattern.path, { frame, module });
            const res = frame.stack.pop();

            if (
                value instanceof EnumType &&
                res instanceof TaggedNode
            ) {
                if (res.name !== value.tag) {
                    return false;
                }

                for (let [index, val] of pattern.patterns.entries()) {
                    if (
                        val instanceof ScopedIdentifierNode &&
                        val.name.length == 1
                    ) {
                        const v = await value.getValue().get({
                            engine: this,
                            frame,
                            module
                        }, new NumberType(index), []);
                        frame.define(val.name[0], v);
                    }
                }

                return true;
            }
        }

        if (pattern instanceof WildcardNode) {
            return true;
        }

        return false;
    }

    async visitTagged(
        node: TaggedNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let _enum;

        if (node.body instanceof TupleVariantNode) {
            const a = [];
            for (const src of node.body.types) {
                await this.visit(src, { frame, module });
                a.push(frame.stack.pop() as Type<any>);
            }

            _enum = new EnumType(node.name, new TupleType(a), node.members);
        } else if (node.body instanceof NumberNode) {
            await this.visit(node.body, { frame, module });
            _enum = new EnumType(node.name, frame.stack.pop(), node.members);
        }

        frame.stack.push(_enum);
    }

    async visitMap(
        node: MapNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const objectProperties: Record<string, Type<any>> = {};

        for (const propNode of node.properties) {
            await this.visit(propNode.value, { frame, module });
            const value = frame.stack.pop() as Type<any>;

            let key: string = propNode.key;

            objectProperties[key] = value;
        }

        frame.stack.push(new MapType(objectProperties));
    }

    async visitSet(
        node: SetNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const values = [];

        for (const src of node.values) {
            await this.visit(src, { frame, module });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new SetType(values));
    }

    async visitArray(
        node: ArrayNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const values = [];

        for (const src of node.elements) {
            await this.visit(src, { frame, module });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new ArrayType(values));
    }

    async visitTuple(
        node: TupleNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const values = [];

        for (const src of node.values) {
            await this.visit(src, { frame, module });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new TupleType(values));
    }

    async visitNumber(
        node: NumberNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        frame.stack.push(new NumberType(node.value));
    }

    async visitString(
        node: StringNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        frame.stack.push(new StringType(node.value));
    }

    async visitBoolean(
        node: BooleanNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        frame.stack.push(new BoolType(node.value));
    }
}