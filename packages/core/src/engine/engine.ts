import {
    ArrayNode,
    ASTNode,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    CallExpressionNode,
    EnumNode,
    EnumVariantNode,
    ExpressionStatementNode,
    FieldNode,
    FunctionDecNode,
    IdentifierNode,
    IfElseNode,
    LambdaNode,
    MapNode,
    MemberDecNode,
    MemberExpressionNode,
    ModuleNode,
    NumberNode,
    ParameterNode,
    ProgramNode,
    ReturnNode,
    ScopedIdentifierNode,
    SetNode,
    SourceElementsNode,
    StringNode,
    StructInitNode,
    StructNode,
    TupleNode,
    TupleVariantNode,
    UseNode,
    VariableNode,
    VariableStatementNode,
    WhileNode
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
        frame: Frame,
        module: Module
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
                throw new Error(`Object ${name} not callable`);
            }

            const filtered = inbuilt.filter
                ? inbuilt.filter(args)
                : args.map(i => i.getValue());

            if (inbuilt.has_callback) {
                filtered.unshift(fn.module); // comeback here
                filtered.unshift(this);
            }

            let value;
            if (inbuilt.async) {
                try {
                    value = await inbuilt.exec(filtered);
                } catch (e: any) {
                    value = e.message
                }
            } else {
                value = inbuilt.exec(filtered)
            }

            if (value)
                frame.stack.push(create_object(value))
        } else {

            await this.visit(fn.body, { frame: new_frame, module: fn.module })

            if (!(fn.body instanceof BlockNode)) {
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
            await this.execute_function(main, [], this.root.frame, this.root);
            let ret = this.root.frame.stack.pop();

            let after = [];

            for (const ext of this.extension.get_extensions()) {
                let val = await ext?.after_main({
                    root: this.root
                })

                if (val) after.push(val);
            }

            if (ret || after.length > 0) {
                const value = ret?.getValue();
                return after.length > 0 ? [value, ...after] : value;
            }

            return null;
        }

        throw new Error("Main function not found!");
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
        args?: Record<string, any>
    ) {
        await this.visit(node.expression, args);
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
            let mod = self.root.children.find(m => m.name === path[0]);
            if (!mod) throw new Error(`Undefined module: '${path[0]}'`);

            for (let i = 1; i < path.length; i++) {
                mod = mod.children.find(m => m.name === path[i]);
                if (!mod) throw new Error(`Undefined module at '${path.slice(0, i + 1).join(".")}'`);
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

        frame.continue_flag = new_frame.continue_flag;
        frame.break_flag = new_frame.break_flag;
        frame.return_flag = new_frame.return_flag;
        frame.return_value = new_frame.return_value;
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const evaluatedArgs: Type<any>[] = [];
        for (const arg of node.args) {
            await this.visit(arg, { frame, module });
            const argValue = frame.stack.pop();
            if (!argValue) throw new Error("Stack underflow - argument evaluation");
            evaluatedArgs.push(argValue);
        }

        //  console.log(node.callee, frame.parent?.parent);

        if (node.callee instanceof ScopedIdentifierNode) {
            await this.visit(node.callee, { frame, module });
            const nd = frame.stack.pop();

            if (!nd) {
                throw new Error(`Function ${node.callee.name[0]} is not defined`);
            }

            if (
                nd instanceof FunctionType ||
                nd instanceof LambdaType
            ) {
                await this.execute_function(nd.getValue(), evaluatedArgs, frame, module);
            } else if (nd instanceof TupleVariantNode) {
                frame.stack.push(new TupleType(evaluatedArgs))
            }
        } else {
            await this.visit(node.callee, { frame, module, args: evaluatedArgs });
            const fn = frame.stack.pop() as FunctionType;

            await this.execute_function(fn.getValue(), evaluatedArgs, frame, module);
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

        const value = object.get(property, args);
        if (!value) {
            throw new Error("Property not found");
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

            const value = object.get(property, []);
            if (!value) {
                throw new Error("Property not found");
            }

            left = {
                value
            };

        } else {
            left = this.getScopedSymbol(node.left as ScopedIdentifierNode, { frame, module });
            if (!left) throw new Error("Stack underflow - left operand");
        }


        await this.visit(node.right, { frame, module })
        const right = frame.stack.pop();
        if (!right) throw new Error("Stack underflow - right operand");

        let result: Type<any>;

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
                throw new Error(`Unsupported operator: ${node.operator}`);
        }

        if (object && property) {
            object.set(property, result)
        }
        else
            left.value = result;

        frame.stack.push(result);
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        await this.visit(node.left, { frame, module })
        const left = frame.stack.pop();
        if (!left) throw new Error("Stack underflow - left operand");

        await this.visit(node.right, { frame, module })
        const right = frame.stack.pop();
        if (!right) throw new Error("Stack underflow - right operand");

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
            case ">":
                result = left.gt(right);
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
                throw new Error(`Unsupported operator: ${node.operator}`);
        }

        frame.stack.push(result);
    }

    getScopedSymbol(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let __p = (search_frame: Frame, name: string) => {
            const symbol = search_frame.get(name);

            if (!symbol) {
                throw new Error(`Symbol '${name}' is not defined`);
            }

            return symbol;
        }

        let current: Module | undefined;
        if (node.name.length == 1) {
            return __p(frame, node.name[0]);
        } else if (node.name[0] == "root") {
            current = this.root;
        } else if (node.name[0] === "self") {
            current = module; // Current module
        } else if (node.name[0] === "super") {
            if (!module.parent) {
                throw new Error("Super on module root")
            }
            current = module.parent; // Parent module
        } else {
            current = module.children.find(m => m.name === node.name[0]);
            if (!current) {
                throw new Error(`Undefined module: '${node.name[0]}'`);
            }
        }

        for (let i = 1; i < node.name.length - 1; i++) {
            if (current) {
                current = current.children.find(m => m.name === node.name[i]);
            } else {
                throw new Error(`Undefined module: '${node.name[1]}'`);
            }
        }

        if (current?.frame)
            return __p(current.frame, node.name[node.name.length - 1])

        return null;
    }

    async visitScopedIdentifier(
        node: ScopedIdentifierNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const symbol = this.getScopedSymbol(node, { frame, module });

        if (!symbol) throw new Error(`Symbol '${node.name.join("::")}' not found`)

        if (symbol instanceof VariableNode ||
            symbol instanceof ParameterNode
        ) {
            frame.stack.push(symbol.value);
        } else if (
            symbol instanceof StructNode ||
            symbol instanceof TupleVariantNode
        ) {
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

        if (symbol instanceof VariableNode ||
            symbol instanceof ParameterNode
        ) {
            frame.stack.push(symbol.value);
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

    async visitBreak(node: ASTNode, { frame }: { frame: Frame }) {
        frame.break_flag = true;
    }

    async visitContinue(node: ASTNode, { frame }: { frame: Frame }) {
        frame.continue_flag = true;
    }

    async visitEnum(
        node: EnumNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const newModule = new Module(node.name);
        const newFrame = newModule.frame;
        module.add_submodule(newModule);

        this.enum = 0;

        for (const src of node.body) {
            await this.visit(src, { frame: newFrame });
        }

        this.enum = 0;
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        let value = node.value ?? new NumberType(this.enum);

        if (!node.value) {
            this.enum++
        }

        frame.define(node.name, value);
    }

    async visitStruct(
        node: StructNode,
        { frame, module }: { frame: Frame, module: Module }
    ) {
        const newModule = new Module(node.name, frame);
        node.module = newModule;
        const newFrame = newModule.frame;

        frame.define(node.name, node);

        let hasExportedFunctions = false;

        for (const src of node.body) {
            if (src instanceof FunctionDecNode && !(src instanceof MemberDecNode)) {
                hasExportedFunctions = true;
                src.frame = newFrame;
                src.module = module;
                newFrame.define(src.identifier.name, src);
            } else if (src instanceof MemberDecNode) {
                src.frame = newFrame;
                src.module = module;
            }
        }

        if (hasExportedFunctions) {
            module.add_submodule(newModule);
        }
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
                    throw new Error(`Missing field '${fieldName}' in struct initialization`);
                }

                instance[fieldName] = providedFields[fieldName];
            } else if (member instanceof MemberDecNode) {
                const methodName = member.identifier.name;
                instance[methodName] = new MemberType(member);
            }
        }

        frame.stack.push(new StructType(instance, struct.name));
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