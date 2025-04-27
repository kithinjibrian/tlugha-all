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
    ImportNode,
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
} from "@kithinji/tlugha-core";

import { Frame, Module } from "@kithinji/tlugha-core";
import { ArrayType } from "@kithinji/tlugha-core";
import { Type } from "@kithinji/tlugha-core";
import { FunctionType } from "@kithinji/tlugha-core";
import { LambdaType } from "@kithinji/tlugha-core";
import { MapType } from "@kithinji/tlugha-core";
import { NumberType } from "@kithinji/tlugha-core";
import { SetType } from "@kithinji/tlugha-core";
import { StringType } from "@kithinji/tlugha-core";
import { TupleType } from "@kithinji/tlugha-core";
import { ExtensionStore } from "@kithinji/tlugha-core";

import { existsSync } from "fs";
import * as path from 'path';
import { create_object } from "@kithinji/tlugha-core";
import { BoolType } from "@kithinji/tlugha-core";
import { StructType } from "@kithinji/tlugha-core";
import { MemberType } from "@kithinji/tlugha-core";
import { Cache } from "./cache";

import {
    builtin,
} from "../types"

export class Engine implements ASTVisitor {
    private current: Module;
    private extension: ExtensionStore<unknown> = ExtensionStore.get_instance();
    private enum: number = 0;

    constructor(
        public rd: string,
        public wd: string,
        public ast: ASTNode,
        public root: Module,
        public lugha: Function
    ) {
        this.current = this.root;
    }

    public async before_accept(
        node: ASTNode,
        args?: Record<string, any>
    ) {
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

    private async execute_function(
        fn: FunctionDecNode | LambdaNode,
        args: Type<any>[],
        frame: Frame
    ) {
        const name = fn instanceof FunctionDecNode ? fn.identifier.name : "lambda";

        const new_frame = new Frame(frame, `fn_${name}`);

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

            await this.visit(fn.body, { frame: new_frame })

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
                    root: this.root,
                    current: this.current
                })
            }
        }

        await this.visit(this.ast, { frame: this.root.frame });

        return this;
    }

    async call_main() {
        let main = this.root.frame.get("main");

        if (main) {
            await this.execute_function(main, [], this.root.frame);
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
        args?: Record<string, any>
    ) {
        const cache = this.current;
        const new_module = new Module(node.identifier.name)
        this.current.add_submodule(new_module);
        this.current = new_module;

        for (const src of node.body) {
            await this.visit(src, {
                ...args,
                frame: new_module.frame,
            });
        }

        this.current = cache;
    }

    find_mod_in_lib_hierarchy(startDir: string, moduleName: string): string | null {
        let currentDir = path.resolve(startDir);

        while (true) {
            const libPath = path.join(currentDir, "lib", moduleName, "__mod__.la");

            if (existsSync(libPath)) {
                return libPath;
            }

            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) break; // Reached root
            currentDir = parentDir;
        }

        return null;
    }

    async visitImport(node: ImportNode, args?: Record<string, any>) {
        const originalWd = this.wd;
        const name = node.identifier.name;

        let fileToImport = `${name}.la`;
        let importWd = originalWd;

        const localPath = path.join(originalWd, fileToImport);
        const localModPath = path.join(originalWd, name, "__mod__.la");

        let modPath: string | null = null;

        if (existsSync(localPath)) {
            modPath = localPath;
        } else if (existsSync(localModPath)) {
            fileToImport = "__mod__.la";
            importWd = path.join(originalWd, name);
            modPath = path.join(importWd, fileToImport);
        } else {
            // Try recursive lib lookup
            const foundLibPath = this.find_mod_in_lib_hierarchy(this.rd, name);

            if (foundLibPath) {
                fileToImport = "__mod__.la";
                importWd = path.dirname(foundLibPath);
                modPath = foundLibPath;
            } else {
                throw new Error(`Couldn't find module: '${name}'`);
            }
        }

        const cache = Cache.get_instance();
        let module = cache.has_mod(modPath)
            ? cache.get_mod(modPath)
            : new Module(name);

        this.current.add_submodule(module);

        if (!cache.has_mod(modPath)) {
            cache.add_mod(modPath, module);

            await this.lugha({
                file: fileToImport,
                wd: importWd,
                rd: this.rd,
                module
            });
        }
    }

    async visitUse(node: UseNode, { frame }: { frame: Frame }) {
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
            const module = resolveModule(node.path.path);
            if (!module) return;

            node.list.items.forEach(item => {
                const symbol = module.frame.get(item.name);

                if (!symbol) {
                    module.children.forEach(mod => {
                        if (mod.name == item.name) {
                            this.current.add_submodule(mod)
                        }
                    })

                    return;
                }

                frame.define(item.alias ?? item.name, symbol);
            });
        } else {
            const path = node.path.path;
            const module = resolveModule(path.slice(0, -1));
            if (!module) return;

            const symbol = module.frame.get(path[path.length - 1]);

            if (!symbol) {
                module.children.forEach(mod => {
                    if (mod.name == path[path.length - 1]) {
                        this.current.add_submodule(mod)
                    }
                })

                return;
            }

            frame.define(node.alias ?? path[path.length - 1], symbol);
        }
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { frame }: { frame: Frame }
    ) {
        frame.define(node.identifier.name, node);
    }

    async visitLambda(
        node: LambdaNode,
        { frame }: { frame: Frame }
    ) {
        frame.stack.push(new LambdaType(node));
    }

    async visitBlock(
        node: BlockNode,
        { frame }: { frame: Frame }
    ) {
        const new_frame = new Frame(frame, node.name);

        for (const n of node.body) {
            await this.visit(n, { frame: new_frame });

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
        { frame }: { frame: Frame }
    ) {
        const evaluatedArgs: Type<any>[] = [];
        for (const arg of node.args) {
            await this.visit(arg, { frame });
            const argValue = frame.stack.pop();
            if (!argValue) throw new Error("Stack underflow - argument evaluation");
            evaluatedArgs.push(argValue);
        }

        if (node.callee instanceof ScopedIdentifierNode) {
            await this.visit(node.callee, { frame });
            const nd = frame.stack.pop();

            if (!nd) {
                throw new Error(`Function ${node.callee.name[0]} is not defined`);
            }

            if (
                nd instanceof FunctionType ||
                nd instanceof LambdaType
            ) {
                await this.execute_function(nd.getValue(), evaluatedArgs, frame);
            } else if (nd instanceof TupleVariantNode) {
                frame.stack.push(new TupleType(evaluatedArgs))
            }
        } else {
            await this.visit(node.callee, { frame, args: evaluatedArgs });
            const fn = frame.stack.pop() as FunctionType;

            await this.execute_function(fn.getValue(), evaluatedArgs, frame);
        }

    }

    async get_object(
        node: MemberExpressionNode,
        { frame }: { frame: Frame }
    ) {
        await this.visit(node.object, { frame });
        const object = frame.stack.pop() as Type<any>;

        let propertyValue: Type<any>;
        if (node.computed) {
            await this.visit(node.property, { frame });
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
        { frame, args }: { frame: Frame, args: Type<any>[] }
    ) {
        const { object, property } = await this.get_object(node, { frame });

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
        { frame }: { frame: Frame }
    ) {
        let value: Type<any> | null = null;

        if (node.expression) {
            await this.visit(node.expression, { frame });
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
        { frame }: { frame: Frame }
    ) {
        await this.visit(node.condition, { frame });
        const condition = frame.stack.pop() as Type<any>;

        if (condition.getValue()) {
            await this.visit(node.consequent, { frame });
        } else {
            await this.visit(node.alternate, { frame });
        }
    }

    async visitAssignmentExpression(
        node: BinaryOpNode,
        { frame }: { frame: Frame }
    ) {
        let left, object = null, property = null;

        if (node.left instanceof MemberExpressionNode) {
            const o = await this.get_object(node.left, { frame });

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
            left = this.getScopedSymbol(node.left as ScopedIdentifierNode, frame);
            if (!left) throw new Error("Stack underflow - left operand");
        }


        await this.visit(node.right, { frame })
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
        { frame }: { frame: Frame }
    ) {
        await this.visit(node.left, { frame })
        const left = frame.stack.pop();
        if (!left) throw new Error("Stack underflow - left operand");

        await this.visit(node.right, { frame })
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
            default:
                throw new Error(`Unsupported operator: ${node.operator}`);
        }

        frame.stack.push(result);
    }

    getScopedSymbol(
        node: ScopedIdentifierNode,
        frame: Frame
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
        } else if (node.name[0] === "self") {
            current = this.current; // Current module
        } else if (node.name[0] === "super") {
            if (!this.current.parent) {
                throw new Error(`'super' used in root module`);
            }
            current = this.current.parent; // Parent module
        } else {
            current = this.root.children.find(m => m.name === node.name[0]);

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
        { frame }: { frame: Frame }
    ) {
        const symbol = this.getScopedSymbol(node, frame);

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
        { frame }: { frame: Frame }
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
        { frame }: { frame: Frame }
    ) {
        await this.visit(node.expression, { frame });
        let condition = frame.stack.pop() as Type<any>;

        while (condition.getValue()) {
            await this.visit(node.body, { frame, name: "while" });
            await this.visit(node.expression, { frame });

            if (frame.break_flag) {
                frame.break_flag = false;
                break;
            }

            if (frame.continue_flag) {
                frame.continue_flag = false;
                await this.visit(node.expression, { frame });
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
        { frame }: { frame: Frame }
    ) {
        if (node.expression) {
            await this.visit(node.expression, { frame });
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
        { frame }: { frame: Frame }
    ) {
        const newModule = new Module(node.name);
        const newFrame = newModule.frame;
        this.current.add_submodule(newModule);

        this.enum = 0;

        for (const src of node.body) {
            await this.visit(src, { frame: newFrame });
        }

        this.enum = 0;
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { frame }: { frame: Frame }
    ) {
        let value = node.value ?? new NumberType(this.enum);

        if (!node.value) {
            this.enum++
        }

        frame.define(node.name, value);
    }

    async visitStruct(
        node: StructNode,
        { frame }: { frame: Frame }
    ) {
        frame.define(node.name, node);

        const newModule = new Module(node.name);
        const newFrame = newModule.frame;
        let hasExportedFunctions = false;

        for (const src of node.body) {
            if (src instanceof FunctionDecNode && !(src instanceof MemberDecNode)) {
                hasExportedFunctions = true;
                newFrame.define(src.identifier.name, src);
            }
        }

        if (hasExportedFunctions) {
            this.current.add_submodule(newModule);
        }
    }

    async visitStructInit(
        node: StructInitNode,
        { frame }: { frame: Frame }
    ) {
        await this.visit(node.name, { frame });
        const struct = frame.stack.pop() as StructNode;

        const providedFields: Record<string, any> = {};

        for (const { iden, expression } of node.fields) {
            await this.visit(expression ?? iden, { frame });
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
        { frame }: { frame: Frame }
    ) {
        const objectProperties: Record<string, Type<any>> = {};

        for (const propNode of node.properties) {
            await this.visit(propNode.value, { frame });
            const value = frame.stack.pop() as Type<any>;

            let key: string = propNode.key;

            objectProperties[key] = value;
        }

        frame.stack.push(new MapType(objectProperties));
    }

    async visitSet(
        node: SetNode,
        { frame }: { frame: Frame }
    ) {
        const values = [];

        for (const src of node.values) {
            await this.visit(src, { frame });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new SetType(values));
    }

    async visitArray(node: ArrayNode, { frame }: { frame: Frame }) {
        const values = [];

        for (const src of node.elements) {
            await this.visit(src, { frame });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new ArrayType(values));
    }

    async visitTuple(node: TupleNode, { frame }: { frame: Frame }) {
        const values = [];

        for (const src of node.values) {
            await this.visit(src, { frame });
            const value = frame.stack.pop() as Type<any>;
            values.push(value);
        }

        frame.stack.push(new TupleType(values));
    }

    async visitNumber(
        node: NumberNode,
        { frame }: { frame: Frame }
    ) {
        frame.stack.push(new NumberType(node.value));
    }

    async visitString(
        node: StringNode,
        { frame }: { frame: Frame }
    ) {
        frame.stack.push(new StringType(node.value));
    }

    async visitBoolean(
        node: BooleanNode,
        { frame }: { frame: Frame }
    ) {
        frame.stack.push(new BoolType(node.value));
    }
}