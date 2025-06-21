import { Panic } from "../error/panic";
import { FatData } from "../fats/data";
import { FatMap } from "../fats/map";
import { CoroType } from "../objects/coro";
import { ModuleType } from "../objects/module";
import {
    AssignmentExpressionNode,
    ASTNode,
    ASTNodeBase,
    ASTVisitor,
    BinaryOpNode,
    BlockNode,
    BooleanNode,
    BoolType,
    builtin,
    CallExpressionNode,
    create_object,
    EEnv,
    EnumType,
    ErrorCodes,
    ExpressionStatementNode,
    ExtensionStore,
    FunctionDecNode,
    id,
    IfElseNode,
    Module,
    ModuleNode,
    NumberNode,
    NumberType,
    ProgramNode,
    ReturnNode,
    PathNode,
    Serializer,
    SourceElementsNode,
    StringNode,
    StringType,
    TError,
    TupleType,
    Type,
    UnitType,
    VariableNode,
    VariableStatementNode,
    IdentifierNode,
    WhileNode,
    ArrayNode,
    ArrayType,
    TupleNode,
    SetNode,
    SetType,
    MapNode,
    MapType,
    StructNode,
    StructModule,
    StructInitNode,
    FieldNode,
    StructType,
    EnumNode,
    EnumModule,
    EnumVariantNode,
    TaggedNode,
    FunctionType,
    TraitNode,
    MatchNode,
    EnumPatternNode,
    WildcardNode,
    StructPatternNode,
    MemberExpressionNode,
    LambdaNode,
    LambdaType,
    ParameterNode,
    BreakNode,
    ContinueNode,
    ImplNode,
    UseNode,
    UnaryOpNode,
    YieldNode,
    CoroNode,
    SpawnNode,
    UnitNode,
    AlreadyInitNode,
    TupleVariantNode,
} from "../types";

export interface ErrorInfo {
    node: ASTNode;
    error_code: string;
    reason: string;
    message: string;
    context: string;
    example: string;
    hint: string;
    expected: Array<string>;
}

export enum thread_state {
    CREATED = "created",
    RUNNING = "running",
    SUSPENDED = "suspended",
    NORMAL = "normal",
    DEAD = "dead",
}

export class Thread {
    public static instance: Thread;
    public __id: string = id(26);
    public stack: Array<XM_Frame> = [];
    public state: thread_state = thread_state.SUSPENDED;
    public parent: Thread | null = null;
    public children: Thread[] = [];

    constructor(
        public name?: string
    ) { }

    public static get_instance(name: string = "main_thread") {
        if (!Thread.instance) {
            Thread.instance = new Thread(name);
        }
        return Thread.instance;
    }

    launch() {
        const thread = new Thread();
        thread.state = thread_state.SUSPENDED;
        thread.parent = this;
        this.children.push(thread);
        return thread;
    }
}

export class XState {
    public phase: string | null = null;
    public namespace: string | null = null;
    private store: FatMap<string, FatMap<string, any>> | null = new FatMap<string, FatMap<string, any>>();
    public __id: string = id(26);

    constructor() { }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "xstate",
            value: {
                phase: this.phase,
                namespace: this.namespace,
                store: serializer.to_json(this.store)
            }
        };
    }

    static from_json(value: any) {
        const state = new XState();

        const { phase, namespace, store } = value;

        state.phase = phase;
        state.namespace = namespace;
        state.store = store;

        return state;
    }

    mount() {
        if (!this.namespace) throw new Error("Mounting a null namespace");

        if (!this.store) {
            this.store = new FatMap<string, FatMap<string, any>>();
        }

        if (this.store.has(this.namespace)) return false;

        this.store.set(this.namespace, new FatMap());

        return true;
    }

    set(key: string, data: any) {
        if (!this.namespace) throw new Error("No phase set");

        if (!this.store) {
            throw new Error("Store not mounted");
        }

        let ns = this.store.get(this.namespace);
        if (!ns) {
            ns = new FatMap();
            this.store.set(this.namespace, ns);
        }

        ns.set(key, new FatData(data));
    }

    get(key: string) {
        if (!this.namespace) throw new Error("No phase set");

        if (!this.store) {
            throw new Error("Store not mounted");
        }

        const ns = this.store.get(this.namespace);
        if (!ns) {
            throw new Error(`Namespace ${this.namespace} not mounted`);
        }

        const fat_data = ns.get(key);
        if (!fat_data) {
            throw new Error(`No data found for key: ${key}`);
        }

        if (fat_data instanceof FatData) {
            return fat_data.data;
        }

        throw new Error(`Invalid data format for key: ${key}`);
    }

    cleanup() {
        this.store = null;
    }
}

class ControlFlowException extends Error {
    public isControlFlow: boolean = true;

    constructor(
        public type: string,
        public value: any = null
    ) {
        super(`Control flow: ${type}`);
    }
}

class ReturnException extends ControlFlowException {
    constructor(value: any) {
        super('RETURN', value);
    }
}

class YieldException extends ControlFlowException {
    constructor(value: any) {
        super('YIELD', value);
    }
}

class BreakException extends ControlFlowException {
    constructor(value: any) {
        super('BREAK', value);
    }
}

class ContinueException extends ControlFlowException {
    constructor(value: any) {
        super('CONTINUE', value);
    }
}

export class XM_Frame {
    public __id: string = id(26);
    public done: boolean = false;
    public node: ASTNode;
    public result?: Type<any>;
    public result_stack: Array<Type<any> | undefined> = [];
    public env: EEnv;
    public module: Module;
    public state: XState = new XState();
    public parent: XM_Frame | null = null;
    public exit: string = "done"
    public allow_return: boolean = false;
    public allow_yield: boolean = false;
    public allow_break: boolean = false;
    public allow_continue: boolean = false;

    constructor({
        node,
        done,
        env,
        module,
        exit,
        allow_return,
        allow_break,
        allow_yield,
        allow_continue,
    }: {
        node: ASTNode,
        env?: EEnv,
        module?: Module,
        done?: boolean,
        exit?: string,
        allow_return?: boolean,
        allow_break?: boolean,
        allow_yield?: boolean,
        allow_continue?: boolean,
    }, parent: XM_Frame | null) {
        this.done = !!done;
        this.node = node;
        this.allow_return = !!allow_return;
        this.allow_break = !!allow_break;
        this.allow_yield = !!allow_yield;
        this.allow_continue = !!allow_continue;

        this.exit = exit || "done";

        if (env) {
            this.env = env
        } else {
            if (parent) {
                this.env = parent.env;
            } else {
                throw new Error("No environment found")
            }
        }

        if (module) {
            this.module = module
        } else {
            if (parent) {
                this.module = parent.module;
            } else {
                throw new Error("No module found")
            }
        }

        this.parent = parent;
    }

    toJSON(serializer: Serializer): any {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "xm_frame",
            value: {
                done: this.done,
                node: serializer.to_json(this.node),
                result: serializer.to_json(this.result),
                env: serializer.to_json(this.env),
                module: serializer.to_json(this.module),
                result_stack: serializer.to_json(this.result_stack),
                state: serializer.to_json(this.state),
                parent: serializer.to_json(this.parent),
            }
        }
    }

    static from_json(value: any) {
        const {
            done,
            node,
            result,
            env,
            module,
            parent,
            state,
            result_stack
        } = value;

        const xm_frame = new XM_Frame({
            node,
            done,
            env,
            module
        }, null);

        xm_frame.state = state;
        xm_frame.result = result;
        xm_frame.parent = parent;
        xm_frame.result_stack = result_stack;

        return xm_frame;
    }

    public push(result: Type<any> | undefined) {
        this.result_stack.push(result);
    }
}

export class XMachina implements ASTVisitor {
    private __id: string = id(26);
    public pipes: any = new Map();
    public out: any = null;

    private extension: Record<string, ExtensionStore<unknown>> = {
        "runtime": ExtensionStore.get_instance(),
        "macro": ExtensionStore.get_instance("macro")
    };


    public thread: Thread;

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public ast?: ASTNode,
        public phase: string = "runtime",
        thread?: Thread,
    ) {
        if (!thread) {
            this.thread = Thread.get_instance();
        } else {
            this.thread = thread;
        }
    }

    public error(err: ErrorInfo): never {
        if (!err) throw new Error("Empty error info");

        const token = err.node?.token || {
            line: 1,
            column: 1,
            line_str: ""
        };

        throw new TError({
            file: this.file,
            code: err.error_code,
            reason: err.reason,
            line: token.line,
            column: token.column,
            lineStr: token.line_str,
            stage: this.phase,
            hint: err.hint,
            context: err.context,
            expected: err.expected,
            example: err.example
        });
    }

    public toJSON(serializer: Serializer): any {
        // console.log(this.root);

        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "XMachina",
            value: {
                phase: this.phase,
                file: this.file,
                rd: this.rd,
                wd: this.wd,
                ast: serializer.to_json(this.ast),
                // frame_stack: this.thread.stack.map((f) => serializer.to_json(f)),
                root: serializer.to_json(this.root),
            }
        }
    }

    static from_json(value: any) {
        const {
            phase,
            file,
            rd,
            wd,
            ast,
            frame_stack,
            root
        } = value;


        const xmachina = new XMachina(
            file,
            rd,
            wd,
            root,
            ast,
            phase
        );

        // xmachina.frame_stack = frame_stack;

        // console.log(xmachina);

        return xmachina;
    }

    public async before_accept(
        node: ASTNode,
        { frame }: { frame: XM_Frame }
    ): Promise<void> {
        // Hook for pre-processing
        if (!frame.state.phase) {
            frame.state.phase = this.phase;
        }

        if (!frame.state.namespace) {
            frame.state.namespace = this.phase;
        }

        // console.log(node.type, frame.state.phase);
    }

    public async visit(
        node?: ASTNode,
        args?: Record<string, any>
    ): Promise<boolean> {
        if (!node) return false;

        try {
            return await node.accept(this, args);
        } catch (error) {
            throw error;
        }
    }

    public async after_accept(node: ASTNode, args?: Record<string, any>): Promise<void> {
        // Hook for post-processing
    }

    public async transition(
        state: Record<string, () => Promise<any>>,
        key: string | null,
    ) {
        if (!key) {
            throw new Error(`Internal error: A phase was not set when entering state`);
        }

        if (!(key in state)) {
            throw new Error(`Internal error: Invalid state transition '${key}'`);
        }

        return await state[key]();
    }

    async call_main() {
        const prog = this.ast as ProgramNode;
        // prog.program.sources.push(
        //     new VariableStatementNode(
        //         null,
        //         new VariableNode(
        //             null,
        //             new IdentifierNode(
        //                 null,
        //                 "out"
        //             ),
        //             false,
        //             false,
        //             new CallExpressionNode(
        //                 null,
        //                 new IdentifierNode(
        //                     null,
        //                     "main"
        //                 ),
        //                 []
        //             )
        //         )
        //     ),
        //     new CallExpressionNode(
        //         null,
        //         new PathNode(
        //             null,
        //             ["root", "builtin", "__write_out__"]
        //         ),
        //         [new IdentifierNode(null, "out")]
        //     )
        // );


        //  await this.run();

        return this.out;
    }

    async start(xmachina: XMachina) {
        if (xmachina.ast) {
            xmachina.thread.stack.push(new XM_Frame({
                node: xmachina.ast,
                env: xmachina.root.env,
                module: xmachina.root
            }, null));
        }

        xmachina.thread.state = thread_state.RUNNING;

        return await xmachina.eval();
    }

    async run(options?: {
        step_limit?: number;
        pause_on_start?: boolean;
        ext_ignore?: boolean;
    }): Promise<any> {
        const { step_limit, pause_on_start = false, ext_ignore } = options || {};

        if (!this.pipes.has(this.phase)) {
            console.log(this.pipes);
            throw new Error(`XMachina doesn't have pipes for this phase`);
        }

        this.pipes.get(this.phase).push(this.start)

        const pipes = this.pipes.get(this.phase);

        let index = 0;

        const next = async () => {
            const pipe = pipes[index++];

            if (pipe) {
                await pipe(this, next);
            }
        }

        await next();
    }

    public async eval(): Promise<XMachina> {
        try {
            while (await this.step()) { }

            console.log("DONE DONE DONE DONE DONE")
        } catch (error) {
            throw error;
        }

        return this;
    }

    async step(): Promise<boolean> {
        // console.log(this.thread.state, this.thread.name);

        if (this.thread.state == thread_state.SUSPENDED) {

            if (this.thread.parent) {
                //from yield
                const suspended_frame = this.thread.stack[this.thread.stack.length - 1];
                const parent_frame = this.thread.parent.stack[this.thread.parent.stack.length - 1];

                // hijack and swap results
                parent_frame.result = suspended_frame.result;

                this.thread = this.thread.parent

                return true;
            }

            return false
        }

        if (this.thread.stack.length === 0) {
            this.thread.state = thread_state.DEAD;

            if (this.thread.parent) {
                this.thread = this.thread.parent
                return true;
            }

            return false
        };

        const XM_Frame = this.thread.stack[this.thread.stack.length - 1];

        if (XM_Frame.done) {
            const finished = this.thread.stack.pop();
            XM_Frame.parent?.push(finished?.result);
            return true;
        }

        try {
            const result = await this.visit(XM_Frame.node, {
                frame: XM_Frame,
            });

            if (result) {
                XM_Frame.done = true;
            }
        } catch (e) {
            if (e instanceof ControlFlowException) {
                this.handle_control_flow(e);
            } else {
                throw e;
            }
        }

        return true;
    }

    handle_control_flow(e: ControlFlowException) {
        const { type, value } = e;

        let unwind = true;
        if (type === 'YIELD') {
            unwind = false;
            const frame = this.thread.stack[this.thread.stack.length - 1];
            frame.done = true;
            this.thread.state = thread_state.SUSPENDED;
        }

        // unwind stack
        let index = this.thread.stack.length - 1;
        while (this.thread.stack.length > 0) {
            const frame = this.thread.stack[index];

            if (type === 'RETURN' && frame.allow_return) {
                if (this.thread.name !== "main_thread") {
                    // suspend thread and then unwind to make it dead
                    this.thread.state = thread_state.SUSPENDED;

                    let t = new TupleType(
                        [
                            value
                        ]
                    );

                    frame.result = new EnumType("Complete", t);
                } else {
                    frame.result = value;
                }

                frame.done = true;
                break;
            } else if (type === 'YIELD' && frame.allow_yield) {
                frame.result = value;
                break;
            } else if (type === 'BREAK' && frame.allow_break) {
                frame.result = new UnitType();
                frame.done = true;
                break;
            } else if (type === 'CONTINUE' && frame.allow_continue) {
                frame.state.phase = "continue";
                break;
            } else {
                index--;

                if (unwind)
                    this.thread.stack.pop()
            }

        }
    }

    async visitProgram(
        node: ProgramNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.program,
                }, frame));

                frame.state.phase = frame.exit;

                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitSourceElements(
        node: SourceElementsNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("index", 0);
                }

                frame.state.phase = "loopy";
                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");

                if (index > node.sources.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.sources[index],
                }, frame));

                frame.state.set("index", index + 1);

                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitModule(
        node: ModuleNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("index", 0);
                    frame.state.set("module", new Module(node.identifier.name));
                    frame.module.add_submodule(frame.state.get("module"));
                }

                frame.state.phase = "loopy";

                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");

                if (index > node.body.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const mod = frame.state.get("module");

                this.thread.stack.push(new XM_Frame({
                    node: node.body[index],
                    done: false,
                    env: mod.env,
                    module: mod
                }, null));

                frame.state.set("index", index + 1);

                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitUse(
        node: UseNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("path", []);
                    frame.state.set("error", null);
                    frame.state.set("module", null);
                    frame.state.set("start", 1);
                    frame.state.set("add_strategy", "add_list");
                }

                if (node.list) {
                    frame.state.phase = "is_list";
                } else {
                    frame.state.phase = "is_path";
                }

                return false;
            },
            is_list: async () => {
                frame.state.set("path", node.path.path);
                frame.state.set("add_strategy", "add_list");
                frame.state.phase = "resolve_module";
                return false;
            },
            is_path: async () => {
                const path = node.path.path;
                frame.state.set("path", path.slice(0, -1));
                frame.state.set("add_strategy", "add_path");
                frame.state.phase = "resolve_module";
                return false;
            },
            resolve_module: async () => {
                const path = frame.state.get("path");

                if (["root", "self", "super"].includes(path[0])) {
                    frame.state.phase = path[0];
                    return false;
                }

                frame.state.phase = "root";
                return false;
            },
            root: async () => {
                const path = frame.state.get("path");

                const module = frame.module.children.find(m => m.name === path[0]);

                if (module) {
                    frame.state.set("module", module);
                    frame.state.phase = "find_target";
                    return false;
                } else {
                    // try searching from the root
                }

                frame.state.phase = "error";
                return false;
            },
            super: async () => {
                // TWO module names ops
                if (!frame.module.parent) {
                    frame.state.phase = "error";
                    return false;
                }

                const path = frame.state.get("path");

                //  console.log(frame.module.parent);

                const module = frame.module.parent.children.find(m => m.name === path[1]);

                if (module) {
                    frame.state.set("start", 2);
                    frame.state.set("module", module);
                    frame.state.phase = "find_target";
                    return false;
                }

                frame.state.phase = "error";
                return false;
            },
            find_target: async () => {
                const path = frame.state.get("path");
                const start = frame.state.get("start");
                let module = frame.state.get("module") as Module;

                for (let i = start; i < path.length; i++) {
                    let mod = module.children.find(m => m.name === path[i]);

                    if (!mod) {
                        frame.state.set("error", {
                            node,
                            error_code: ErrorCodes.runtime.UNDEFINED_MODULE,
                            reason: `Undefined submodule: '${path[i]}'`,
                            hint: `The submodule '${path[i]}' does not exist in '${module.name}'.`,
                            context: "Tried to traverse a non-existent submodule path.",
                            expected: ["existing submodule"],
                            example: `use ${path.join("::")}; where '${path[i]}' is not a submodule of '${module.name}'.`
                        });

                        frame.state.phase = "error";
                        return false;
                    }

                    module = mod;
                }

                frame.state.set("module", module);
                frame.state.phase = frame.state.get("add_strategy");

                return false;
            },
            add_list: async () => {
                const module = frame.state.get("module") as Module;

                node.list?.items.forEach(item => {
                    const symbol = module.env.get(item.name);

                    if (!symbol) {
                        module.children.forEach(m => {
                            if (m.name == item.name) {
                                frame.module.add_submodule(m)
                            }
                        })

                        frame.state.phase = frame.exit;
                        return false;
                    } else if (symbol instanceof StructNode) {
                        frame.module.add_submodule(symbol.module.get(this.phase))
                    }

                    frame.env.define(item.alias ?? item.name, symbol);
                });

                frame.state.phase = frame.exit;
                return false;
            },
            add_path: async () => {
                const path = node.path.path;
                const module = frame.state.get("module") as Module;

                const symbol = module.env.get(path[path.length - 1]);

                if (!symbol) {
                    module.children.forEach(m => {
                        if (m.name == path[path.length - 1]) {
                            frame.module.add_submodule(m)
                        }
                    })

                    frame.state.phase = frame.exit;
                    return false;
                } else if (symbol instanceof StructNode) {
                    frame.module.add_submodule(symbol.module.get(this.phase))
                }

                frame.env.define(path[path.length - 1], symbol);

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitCoro(
        node: CoroNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    // do nothing
                }

                frame.env.define(node.identifier.name, node);

                if (!node.env.has(this.phase)) {
                    node.env.set(this.phase, frame.env);
                }

                if (!node.module.has(this.phase)) {
                    node.module.set(this.phase, frame.module);
                }

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };


        return await this.transition(states, frame.state.phase);
    }

    async visitFunctionDec(
        node: FunctionDecNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    // do nothing
                }

                frame.env.define(node.identifier.name, node);

                if (!node.env.has(this.phase)) {
                    node.env.set(this.phase, frame.env);
                }

                if (!node.module.has(this.phase)) {
                    node.module.set(this.phase, frame.module);
                }

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };


        return await this.transition(states, frame.state.phase);
    }

    async visitLambda(
        node: LambdaNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    // do nothing
                }

                frame.result = new LambdaType(
                    node,
                    frame.module,
                    frame.env
                )

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };


        return await this.transition(states, frame.state.phase);
    }

    async visitSpawn(
        node: SpawnNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    // do nothing
                }

                this.thread = this.thread.launch();

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitCallExpression(
        node: CallExpressionNode,
        { frame }: { frame: XM_Frame }
    ) {
        //  console.log(frame.state.phase)
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("callable", undefined);
                    frame.state.set("error", null);
                    frame.state.set("result", null);
                    frame.state.set("arg_index", 0);
                    frame.state.set("args_evaluated", []);
                    frame.state.set("env", null);
                    frame.state.set("module", null);
                    frame.state.set("entry", "runtime");
                }

                frame.state.phase = "evaluate_args";

                return false;
            },
            evaluate_args: async () => {
                const arg_index = frame.state.get("arg_index");

                if (arg_index > node.args.length - 1) {
                    frame.state.phase = "get_callee";
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.args[arg_index],
                }, frame))

                frame.state.phase = "collect_arg";
                return false;
            },
            collect_arg: async () => {
                const arg_index = frame.state.get("arg_index");
                const args_evaluated = frame.state.get("args_evaluated");
                const arg = frame.result_stack.pop();

                if (!(arg instanceof Type)) {
                    throw new Error(`Expected a type but got ${typeof arg}`);
                }

                frame.state.set("args_evaluated", [...args_evaluated, arg]);
                frame.state.set("arg_index", arg_index + 1);

                // continue collecting args
                frame.state.phase = "evaluate_args";
                return false;
            },
            get_callee: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.callee
                }, frame));

                frame.state.phase = "check_type";

                return false;
            },
            check_type: async () => {
                const callee = frame.result_stack.pop();
                frame.state.set("callable", callee);

                if (callee instanceof FunctionType) {
                    frame.state.phase = "prepare_call";
                    return false;
                } else if (callee instanceof TaggedNode) {
                    frame.state.phase = "is_enum";
                    return false;
                } else if (callee instanceof LambdaType) {
                    frame.state.phase = "prepare_lambda";
                    return false;
                } else if (callee instanceof CoroNode) {
                    frame.state.phase = "prepare_coro";
                    return false;
                }

                frame.state.phase = frame.exit;
                return false;
            },
            is_enum: async () => {
                const en = frame.state.get("callable") as TaggedNode;
                const args = frame.state.get("args_evaluated");

                frame.result = new EnumType(
                    en.name,
                    new TupleType(args),
                    en.members
                );

                frame.state.phase = frame.exit;

                return false;
            },
            prepare_coro: async () => {
                const entry = frame.state.get("entry");
                // should return coro_type
                const fun = frame.state.get("callable") as CoroNode;

                // frame.result = new CoroType(100, this, frame);
                // this.temp.push(new XM_Frame({
                //     node: fun.body,
                //     allow_yield: true
                // }, frame));

                frame.state.phase = "done";
                return false;
            },
            prepare_call: async () => {
                const entry = frame.state.get("entry");
                const fun = frame.state.get("callable").getValue() as FunctionDecNode;

                frame.state.set("module", fun.module.get(entry));
                frame.state.set("env", new EEnv(fun.env.get(entry), `fun_${fun.identifier.name}`));

                frame.state.phase = "bind_params";
                return false;
            },
            prepare_lambda: async () => {
                const lambda = frame.state.get("callable") as LambdaType;

                frame.state.set("module", lambda.module);
                frame.state.set("env", new EEnv(lambda.env, `lambda`));

                frame.state.phase = "bind_params";
                return false;
            },
            bind_params: async () => {
                const callable = frame.state.get("callable").getValue();
                const env = frame.state.get("env") as EEnv;

                callable.params?.parameters.forEach((param: ParameterNode, index: number) => {
                    env.define(
                        param.identifier.name,
                        frame.state.get("args_evaluated")[index]
                    );
                });


                frame.state.phase = "call";
                return false;
            },
            call: async () => {
                const fun = frame.state.get("callable").getValue() as FunctionDecNode;

                if (fun.inbuilt) {
                    frame.state.phase = "inbuilt";
                    return false;
                }

                frame.state.phase = "native";
                return false;
            },
            native: async () => {
                const fun = frame.state.get("callable").getValue() as FunctionDecNode;
                const env = frame.state.get("env") as EEnv;
                const module = frame.state.get("module") as Module;

                this.thread.stack.push(new XM_Frame({
                    node: fun.body,
                    env,
                    module,
                    allow_return: true,
                }, frame));

                frame.state.phase = "wait";

                return false;
            },
            inbuilt: async () => {
                const fun = frame.state.get("callable").getValue() as FunctionDecNode;
                const name = fun.identifier.name;
                const inbuilt = builtin[name];

                if (inbuilt.type != "function") {
                    frame.state.set("error", {
                        fun,
                        error_code: ErrorCodes.runtime.NOT_CALLABLE,
                        reason: `Object '${name}' is not callable.`,
                        hint: "You attempted to call something that is not a function or callable object.",
                        context: `The object '${name}' was used with '()' but does not support being invoked.`,
                        expected: ["function", "callable object"],
                        example: "Example: let f = () -> {}; f();",
                    });

                    frame.state.phase = "error";

                    return false;
                }

                let args = frame.state.get("args_evaluated") as Type<any>[];

                const filtered = inbuilt.filter
                    ? inbuilt.filter(args)
                    : args.map(i => i.getValue());

                if (inbuilt.has_callback) {
                    filtered.unshift(this);
                }

                let value;
                if (inbuilt.async) {
                    value = await inbuilt.exec(filtered);
                    frame.result = create_object(value);
                } else {
                    try {
                        value = inbuilt.exec(filtered);

                        if (value instanceof ASTNodeBase) {
                            this.thread.stack.push(new XM_Frame({
                                node: value,
                            }, frame));

                            frame.state.phase = "collect_result";
                            return false;
                        }
                        frame.result = create_object(value);
                    } catch (e) {
                        if (e instanceof Panic) {
                            throw e;
                        }

                        console.log(e);
                    }
                }

                frame.state.phase = frame.exit;
                return false;
            },
            wait: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.phase = frame.exit;
                return false;
            },
            collect_result: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitTagged(
        node: TaggedNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.state.set("enum", null);
                    frame.state.set("index", 0);
                    frame.state.set("types", []);
                }

                if (node.body instanceof TupleVariantNode) {
                    frame.state.phase = "to_tuple";
                    return false;
                } else if (node.body instanceof StringNode) {
                    frame.state.phase = "to_string";
                    return false;
                }

                frame.state.phase = frame.exit;
                return false;
            },
            to_tuple: async () => {
                const index = frame.state.get("index");
                const tuple = (node.body as TupleVariantNode);
                const types = frame.state.get("types");

                if (index >= tuple.types.length) {
                    frame.result = new EnumType(node.name, new TupleType(types), node.members);
                    frame.state.phase = frame.exit;
                    return false;
                }

                const src = tuple.types[index];

                if (src instanceof FunctionDecNode) {
                    types.push(new FunctionType(src));

                    frame.state.set("index", index + 1);
                } else {
                    this.thread.stack.push(new XM_Frame({
                        node: src,
                    }, frame));

                    frame.state.phase = "collect_type";
                    return false;
                }

                frame.state.phase = "to_tuple";
                return false;
            },
            collect_type: async () => {
                const types = frame.state.get("types");
                const index = frame.state.get("index");
                const type = frame.result_stack.pop();

                types.push(type);

                frame.state.set("index", index + 1);

                frame.state.phase = "to_tuple";
                return false;
            },
            to_string: async () => {
                throw new Error("Not implemented. Tagged Union");
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }


    // REMOVE MEMBER EXPRESSIONS
    async visitMemberExpression(
        node: MemberExpressionNode,
        { frame }: { frame: XM_Frame }
    ) {
        // console.log("phase", frame.state.phase)

        const states: Record<string, () => Promise<boolean>> = {
            create_obj_n_prop: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.state.set("object", null);
                    frame.state.set("property", null);
                    frame.state.set("object_create", "create_op");
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.object
                }, frame));

                frame.state.phase = "collect_object";
                return false;
            },
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.state.set("object", null);
                    frame.state.set("property", null);
                    frame.state.set("object_create", "value");
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.object
                }, frame));

                frame.state.phase = "collect_object";
                return false;
            },
            collect_object: async () => {
                const obj = frame.result_stack.pop();

                frame.state.set("object", obj);
                if (node.computed) {
                    frame.state.phase = "prop_is_computed";
                    return false;
                }

                frame.state.phase = "simple_prop";
                return false;
            },
            prop_is_computed: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.property
                }, frame));

                frame.state.phase = "collect_prop";

                return false;
            },
            collect_prop: async () => {
                frame.state.set("property", frame.result_stack.pop());

                frame.state.phase = frame.state.get("object_create");

                return false;
            },
            simple_prop: async () => {
                let name = (node.property as IdentifierNode).name;
                frame.state.set("property", new StringType(name));

                frame.state.phase = frame.state.get("object_create");

                return false;
            },
            value: async () => {
                let object = frame.state.get("object");
                let property = frame.state.get("property")

                frame.result = await object.get(
                    {},
                    property,
                    []
                );

                //console.log(frame.result);

                frame.state.phase = frame.exit;
                return false;
            },
            create_op: async () => {
                let object = frame.state.get("object");
                let property = frame.state.get("property")

                frame.result = {
                    object,
                    property
                } as any;

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitMatch(
        node: MatchNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.state.set("expression", null);
                    frame.state.set("index", 0);
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = "collect_expression";
                return false;
            },
            collect_expression: async () => {
                frame.state.set("expression", frame.result_stack.pop());
                frame.state.phase = "loop_arms";
                return false;
            },
            loop_arms: async () => {
                const index = frame.state.get("index");

                if (index > node.arms.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const arm = node.arms[index];

                if (arm.pattern instanceof WildcardNode) {
                    frame.state.phase = "is_match";
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: arm.pattern,
                }, frame));

                frame.state.phase = "check_match";

                return false;
            },
            check_match: async () => {
                const index = frame.state.get("index");
                const pattern = frame.result_stack.pop();
                const expression = frame.state.get("expression");

                frame.state.set("pattern", pattern);

                if (
                    pattern instanceof EnumType &&
                    expression instanceof EnumType
                ) {
                    frame.state.phase = "enum_match";
                    return false;
                } else if (
                    pattern instanceof TaggedNode &&
                    expression instanceof EnumType
                ) {
                    frame.state.phase = "te_match";
                    return false;
                } else if (
                    pattern instanceof StructNode &&
                    expression instanceof StructType
                ) {
                    frame.state.phase = "struct_match";
                    return false;
                } else if (
                    pattern instanceof NumberType &&
                    expression instanceof NumberType
                ) {
                    frame.state.phase = "type_match";
                    return false;
                } else if (
                    pattern instanceof StringType &&
                    expression instanceof StringType
                ) {
                    frame.state.phase = "type_match";
                    return false;
                }

                frame.state.set("index", index + 1);
                frame.state.phase = "loop_arms";
                return false;
            },
            enum_match: async () => {
                const index = frame.state.get("index");
                const pattern = frame.state.get("pattern") as EnumType;
                const expression = frame.state.get("expression") as EnumType;

                if (pattern.tag === expression.tag) {
                    frame.state.phase = "is_match";
                    return false;
                }

                frame.state.set("index", index + 1);
                frame.state.phase = "loop_arms";
                return false;
            },
            te_match: async () => {
                const index = frame.state.get("index");
                const pattern = frame.state.get("pattern") as TaggedNode;
                const expression = frame.state.get("expression") as EnumType;

                if (pattern.name !== expression.tag) {
                    frame.state.set("index", index + 1);
                    frame.state.phase = "loop_arms";
                    return false;
                }

                const arm = node.arms[index];
                const enum_pattern = arm.pattern as EnumPatternNode;

                if (enum_pattern.patterns) {
                    for (let i = 0; i < enum_pattern.patterns.length; i++) {
                        const p = enum_pattern.patterns[i] as IdentifierNode;
                        const v = expression.getValue().value[i];
                        frame.env.define(p.name, v);
                    }
                }

                frame.state.phase = "is_match";
                return false;
            },
            struct_match: async () => {
                const index = frame.state.get("index");
                const pattern = frame.state.get("pattern") as StructNode;
                const expression = frame.state.get("expression") as StructType;

                if (pattern.name !== expression.name) {
                    frame.state.set("index", index + 1);
                    frame.state.phase = "loop_arms";
                    return false;
                }

                const arm = node.arms[index];
                const struct_pattern = arm.pattern as StructPatternNode;
                if (struct_pattern.patterns) {
                    for (let i = 0; i < struct_pattern.patterns.length; i++) {
                        const field = struct_pattern.patterns[i];
                        const name = field.iden.name;
                        frame.env.define(name, expression.value[name]);
                    }

                }

                frame.state.phase = "is_match";
                return false;
            },
            type_match: async () => {
                const pattern = frame.state.get("pattern") as Type<any>;
                const expression = frame.state.get("expression") as Type<any>;

                let env = {
                    engine: this,
                    env: frame.env,
                    module: frame.module
                };

                if ((await pattern.eq(env, expression)).getValue()) {
                    frame.state.phase = "is_match";
                    return false;
                }

                frame.state.set("index", frame.state.get("index") + 1);
                frame.state.phase = "loop_arms";

                return false;
            },
            is_match: async () => {
                const index = frame.state.get("index");
                const arm = node.arms[index];

                this.thread.stack.push(new XM_Frame({
                    node: arm.exp_block,
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            collect_value: async () => {
                frame.result = frame.result_stack.pop();

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitEnumPattern(
        node: EnumPatternNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.path
                }, frame))

                frame.state.phase = "collect_enum";

                return false;
            },
            collect_enum: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitStructPattern(
        node: StructPatternNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.path
                }, frame))

                frame.state.phase = "collect_struct";
                return false;
            },
            collect_struct: async () => {
                frame.result = frame.result_stack.pop();

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitWildcard(
        node: WildcardNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    private transform(symbol: ASTNode): any {
        if (
            symbol instanceof Type ||
            symbol instanceof StructNode ||
            symbol instanceof TraitNode
        ) {
            return symbol;
        } else if (symbol instanceof TaggedNode) {
            if (symbol.body instanceof StringNode) {
                return new EnumType(
                    symbol.name,
                    symbol.body.value,
                    symbol.members
                )
            } else if (symbol.body instanceof StructNode) {
                return symbol.body
            }

            return symbol;
        } else if (symbol instanceof FunctionDecNode) {
            return new FunctionType(symbol);
        } else if (symbol instanceof CoroNode) {
            return symbol; // should change here
        } else {
            throw new Error(`Unknown object in engine: ${symbol}`)
        }
    }

    async visitPath(
        node: PathNode,
        { frame }: { frame: XM_Frame }
    ) {
        //  console.log("phase============", frame.state.phase)
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("env", null);
                    frame.state.set("current", null);
                    frame.state.set("identifier", null);
                    frame.state.set("hold", null);
                    frame.state.set("error", null);
                }

                if (node.name.length == 1) {
                    frame.state.set("env", frame.env);
                    frame.state.set("current", frame.module);
                    frame.state.set("identifier", node.name[0]);
                    frame.state.phase = "identifier";
                    return false;
                }

                const root_token = node.name[0];

                if (["root", "self", "super"].includes(root_token)) {
                    frame.state.phase = root_token;
                    return false;
                }

                frame.state.phase = "catch_all";
                return false;
            },
            root: async () => {
                frame.state.set("current", this.root);
                frame.state.phase = "find_target";
                return false;
            },
            self: async () => {
                frame.state.set("current", frame.module);
                frame.state.phase = "find_target";
                return false;
            },
            super: async () => {
                if (!frame.module.parent) {
                    frame.state.set("error", {
                        node,
                        error_code: ErrorCodes.runtime.INVALID_SUPER_REFERENCE,
                        reason: "Cannot use 'super' at the root module.",
                        hint: "'super' refers to a parent module, which doesn't exist at the root level.",
                        context: "Tried to access parent of the root module.",
                        expected: ["self", "root", "or specific module name"],
                        example: `
// ❌❌❌ Invalid
fun my_function(): unit { ... }

// function my_function exist in root module
// the root scope doesn't have a parent
super::my_function();

// ✅️✅️✅️ valid
fun my_function(): unit  { ... }

module my_module {
    fun another(): unit  {
        // works because my_module is a child of the root module
        // so it has a parent module that super refers to
        super::my_function();
    }
}
`
                    });

                    frame.state.phase = "error";
                    return false;
                }

                frame.state.set("current", frame.module.parent);
                frame.state.phase = "find_target";
                return false;
            },
            catch_all: async () => {
                const root_token = node.name[0];

                let mod = frame.module.children.find((m) => m.name === root_token);

                if (mod) {
                    // module is a child of the current module
                    frame.state.set("current", mod);
                    frame.state.phase = "find_target";
                    return false;
                }

                frame.state.set("error", {
                    node,
                    error_code: ErrorCodes.runtime.UNDEFINED_MODULE,
                    reason: `Undefined module: '${root_token}'`,
                    hint: `The module '${root_token}' does not exist in '${frame.module.name}'.`,
                    context: "Tried to traverse a non-existent module path.",
                    expected: ["existing module"],
                    example: `use ${node.name.join("::")}; where '${root_token}' is not a module of '${frame.module.name}'.`
                });

                frame.state.phase = "error";
                return false;
            },
            find_target: async () => {
                // skip the first token and last token
                for (let i = 1; i < node.name.length - 1; i++) {
                    const next = node.name[i];

                    let c = frame.state.get("current") as Module;
                    const _current = c.children.find(
                        (m: Module) => m.name === next
                    )

                    if (!_current) {
                        frame.state.set("error", {
                            node,
                            error_code: ErrorCodes.runtime.UNDEFINED_MODULE,
                            reason: `Undefined submodule: '${next}'`,
                            hint: `The submodule '${next}' does not exist in '${node.name[i - 1]}'.`,
                            context: "Tried to traverse a non-existent submodule path.",
                            expected: ["existing submodule"],
                            example: `use ${node.name.join("::")}; where '${next}' is not a submodule of '${node.name[i - 1]}'.`
                        });

                        frame.state.phase = "error";
                        return false;
                    }

                    frame.state.set("current", _current);
                }

                // the last token is the identifier
                let current = frame.state.get("current") as Module;
                frame.state.set("env", current.env);
                frame.state.set("identifier", node.name[node.name.length - 1]);
                frame.state.phase = "identifier";

                return false;
            },
            identifier: async () => {
                const identifier = frame.state.get("identifier") as string;
                const _env = frame.state.get("env") as EEnv;

                let symbol = _env.get(identifier);

                if (!symbol) {

                    //console.log(_env);

                    frame.state.set("error", {
                        node,
                        error_code: ErrorCodes.runtime.UNDEFINED_SYMBOL,
                        reason: `Symbol '${identifier}' is not defined.`,
                        hint: "You may have a typo or used a symbol before declaring it.",
                        context: `Symbol '${identifier}' was not found in the current scope.`,
                        expected: ["defined variable or function"],
                        example: `Valid: let ${identifier} = 42; let a = ${identifier} + 10; invalid: let sum = w + 10; Symbol 'w' is not defined.`
                    });

                    frame.state.phase = "error";
                    return false;
                }

                frame.state.set("hold", symbol);

                frame.state.phase = "transform";

                return false;
            },
            transform: async () => {
                const symbol = frame.state.get("hold");

                frame.result = this.transform(symbol);

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error")); // exit with error
            },
            done: async () => {
                frame.state.cleanup();

                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitIdentifier(
        node: IdentifierNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("hold", null);
                    frame.state.set("error", null);
                }

                const symbol = frame.env.get(node.name);

                if (!symbol) {
                    frame.state.phase = "maybe_is_module";
                    return false;
                }

                frame.state.set("hold", symbol);

                frame.state.phase = "transform";
                return false;
            },
            maybe_is_module: async () => {
                if (frame.module.name == node.name) {
                    frame.result = frame.module as any;
                    frame.state.phase = frame.exit;
                    return false;
                }

                const mod = frame.module.children.find((m) => m.name === node.name);

                if (mod) {
                    frame.result = new ModuleType(mod);
                    frame.state.phase = frame.exit;
                    return false;
                }

                frame.state.set("error", {
                    node,
                    error_code: ErrorCodes.runtime.UNDEFINED_SYMBOL,
                    reason: `Symbol '${node.name}' is not defined.`,
                    hint: "You may have a typo or used a symbol before declaring it.",
                    context: `Symbol '${node.name}' was not found in the current scope.`,
                    expected: ["defined variable or function"],
                    example: `Valid: let ${node.name} = 42; let a = ${node.name} + 10; invalid: let sum = w + 10; Symbol 'w' is not defined.`
                });

                frame.state.phase = "error";
                return false;
            },
            transform: async () => {
                const symbol = frame.state.get("hold");

                frame.result = this.transform(symbol);

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitBlock(
        node: BlockNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("index", 0);
                    frame.state.set("env", new EEnv(
                        frame.env,
                        node.name
                    ));
                }

                frame.state.phase = "loopy";
                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");

                if (index > node.body.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const env = frame.state.get("env");

                this.thread.stack.push(new XM_Frame({
                    node: node.body[index],
                    env,
                }, frame));

                frame.state.set("index", index + 1);

                return false;
            },
            done: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitExpressionStatement(
        node: ExpressionStatementNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.result = new UnitType();

                frame.state.cleanup();

                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitYield(
        node: YieldNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (node.expression) {
                    frame.state.phase = "expression";
                    return false;
                }

                frame.state.phase = "no_expression";
                return false;
            },
            expression: async () => {
                if (!node.expression) {
                    // should never reach here
                    throw new Error("Internal error: No expression found");
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = "collect_result";
                return false;
            },
            collect_result: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.phase = frame.exit;
                return false;
            },
            no_expression: async () => {
                frame.result = new UnitType();
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();

                let t = new TupleType(
                    [
                        frame.result as any
                    ]
                );

                let adt = new EnumType("Yield", t);
                frame.result = adt;
                throw new YieldException(adt);
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitReturn(
        node: ReturnNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (node.expression) {
                    frame.state.phase = "expression";
                    return false;
                }

                frame.state.phase = "no_expression";
                return false;
            },
            expression: async () => {
                if (!node.expression) {
                    // should never reach here
                    throw new Error("Internal error: No expression found");
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = "collect_result";
                return false;
            },
            collect_result: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.phase = frame.exit;
                return false;
            },
            no_expression: async () => {
                frame.result = new UnitType();
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                throw new ReturnException(frame.result);
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitBreak(
        node: BreakNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                throw new BreakException(frame.result);
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitContinue(
        node: ContinueNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                throw new ContinueException(frame.result);
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitIfElse(
        node: IfElseNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.condition,
                }, frame));

                frame.state.phase = "branch";

                return false;
            },
            branch: async () => {
                const condition = frame.result_stack.pop();

                if (condition?.getValue()) {
                    frame.state.phase = "consequent";
                    return false;
                } else {
                    if (node.alternate) {
                        frame.state.phase = "alternate";
                        return false;
                    }
                }

                frame.state.phase = frame.exit;

                return false;
            },
            consequent: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.consequent,
                }, frame));

                frame.state.phase = frame.exit;

                return false;
            },
            alternate: async () => {
                if (!node.alternate)
                    throw new Error("Internal error: Invalid transition to if's alternate block");

                this.thread.stack.push(new XM_Frame({
                    node: node.alternate,
                }, frame));

                frame.state.phase = frame.exit;

                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.result = frame.result_stack.pop();
                frame.state.cleanup();
                return true;
            }
        }


        return await this.transition(states, frame.state.phase);
    }

    async visitWhile(
        node: WhileNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.allow_break = true;
                    frame.allow_continue = true;
                }

                frame.state.phase = "expression";

                return false;
            },
            expression: async () => {
                frame.result_stack = [];

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = "branch";

                return false;
            },
            branch: async () => {
                const condition = frame.result_stack.pop();

                if (condition?.getValue()) {
                    frame.state.phase = "body";
                    frame.result_stack = [];
                    return false;
                }

                frame.state.phase = frame.exit;

                return false;
            },
            body: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.body,
                }, frame));

                frame.state.phase = "expression";

                return false;
            },
            continue: async () => {
                frame.state.phase = "expression";
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitVariableList(
        node: VariableStatementNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.variables,
                }, frame));
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitVariable(
        node: VariableNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                }

                if (node.expression) {
                    frame.state.phase = "expression";
                    return false;
                }

                frame.state.phase = "define";
                return false;
            },
            expression: async () => {
                if (!node.expression) {
                    throw new Error("Internal error: No expression found in variable");
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.expression,
                }, frame));

                frame.state.phase = "define_with_value";
                return false;
            },
            define_with_value: async () => {
                let res = frame.result_stack.pop();

                if (!(res instanceof Type)) {
                    frame.state.set("error", {
                        node,
                        error_code: 'TYPE_ERROR',
                        reason: "Expected expression to evaluate to a type",
                        message: `Variable '${node.identifier.name}' assignment failed`,
                        context: "Variable definition",
                        example: "let x = 42;",
                        hint: "Ensure the right-hand side expression evaluates to a valid type",
                        expected: ["Type instance"]
                    });

                    frame.state.phase = "error";
                    return false;
                }

                frame.env.define(node.identifier.name, res);
                frame.state.phase = frame.exit;
                return false;
            },
            define: async () => {
                frame.env.define(node.identifier.name, new UnitType());
                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitUnaryOp(
        node: UnaryOpNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("operand", null);
                    frame.state.set("error", null);
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.operand,
                }, frame));

                frame.state.phase = "operand";

                return false;
            },
            operand: async () => {
                const operand = frame.result_stack.pop() as Type<Boolean>;
                frame.state.set("operand", operand);

                const _env = { engine: this, env: frame.env, module };

                let result: Type<any>;
                switch (node.operator) {
                    case "!":
                        result = await operand.not(_env);
                        break;
                    default:
                        frame.state.set("error", {
                            node,
                            error_code: 'TYPE_ERROR',
                            reason: "Unknown unary operator",
                            message: `Unary operation '${node.operator}' failed`,
                            context: "Unary expression evaluation",
                            example: "!x",
                            hint: "Ensure the operand evaluates to a valid type",
                            expected: ["Type instance"]
                        })

                        frame.state.phase = "error";
                        return false;
                }

                frame.result = result;
                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitBinaryOp(
        node: BinaryOpNode,
        { frame }: { frame: XM_Frame }
    ): Promise<any> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("left", null);
                    frame.state.set("right", null);
                    frame.state.set("error", null);
                }

                frame.state.phase = "left";

                return false;
            },
            left: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.left,
                }, frame));

                frame.state.phase = "right";

                return false;
            },
            right: async () => {
                const left = frame.result_stack.pop();

                if (!(left instanceof Type)) {
                    frame.state.set("error", {
                        node,
                        error_code: 'TYPE_ERROR',
                        reason: "Left operand must be a type",
                        message: `Binary operation '${node.operator}' failed`,
                        context: "Binary expression evaluation",
                        example: "5 + 3",
                        hint: "Ensure the left operand evaluates to a valid type",
                        expected: ["Type instance"]
                    });

                    frame.state.phase = "error";
                    return false;
                }

                frame.state.set("left", left);

                this.thread.stack.push(new XM_Frame({
                    node: node.right,
                }, frame));

                frame.state.phase = "apply";

                return false;
            },
            apply: async () => {
                const right = frame.result_stack.pop();

                if (!(right instanceof Type)) {
                    frame.state.set("error", {
                        node,
                        error_code: 'TYPE_ERROR',
                        reason: "Right operand must be a type",
                        message: `Binary operation '${node.operator}' failed`,
                        context: "Binary expression evaluation",
                        example: "5 + 3",
                        hint: "Ensure the right operand evaluates to a valid type",
                        expected: ["Type instance"]
                    })

                    frame.state.phase = "error";
                    return false;
                }

                frame.state.set("right", right);

                const left = frame.state.get("left");

                const _env = { engine: this, env: frame.env, module };

                try {
                    let result = null;
                    switch (node.operator) {
                        case "+":
                            result = await left.add(_env, right);
                            break;
                        case "-":
                            result = await left.minus(_env, right);
                            break;
                        case "*":
                            result = await left.multiply(_env, right);
                            break;
                        case "/":
                            result = await left.divide(_env, right);
                            break;
                        case "%":
                            result = await left.modulo(_env, right);
                            break;
                        case "<":
                            result = await left.lt(_env, right);
                            break;
                        case "<=":
                            result = await left.lte(_env, right);
                            break;
                        case ">":
                            result = await left.gt(_env, right);
                            break;
                        case ">=":
                            result = await left.gte(_env, right);
                            break;
                        case "==":
                            result = await left.eq(_env, right);
                            break;
                        case "!=":
                            result = await left.neq(_env, right);
                            break;
                        case "&&":
                            result = await left.and(_env, right);
                            break;
                        case "||":
                            result = await left.or(_env, right);
                            break;
                        default:
                            frame.state.set("error", {
                                node,
                                error_code: 'UNSUPPORTED_OPERATION',
                                reason: `Unsupported binary operator: ${node.operator}`,
                                message: `Unknown operator '${node.operator}'`,
                                context: "Binary expression evaluation",
                                example: "5 + 3, 10 - 2, 4 * 6, 8 / 2",
                                hint: "Use supported operators: +, -, *, /",
                                expected: ["+", "-", "*", "/"]
                            })
                            frame.state.phase = "error";
                            return false;
                    }

                    frame.result = result;
                } catch (error: any) {
                    frame.state.set("error", {
                        node,
                        error_code: 'RUNTIME_ERROR',
                        reason: `Operation failed: ${error.message}`,
                        message: `Binary operation '${node.operator}' encountered an error`,
                        context: "Binary expression evaluation",
                        example: "5 + 3",
                        hint: "Check operand types and values",
                        expected: ["Compatible operand types"]
                    });

                    frame.state.phase = "error";
                    return false;
                }

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        };

        return await this.transition(states, frame.state.phase);
    }

    async visitAssignmentExpression(
        node: AssignmentExpressionNode,
        { frame }: { frame: XM_Frame }
    ): Promise<boolean> {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("left", null);
                    frame.state.set("assignment_strategy", null);
                    frame.state.set("result", null);
                    frame.state.set("object", null);
                    frame.state.set("property", null);
                    frame.state.set("error", null);
                }

                if (node.left instanceof PathNode ||
                    node.left instanceof IdentifierNode) {
                    frame.state.phase = "go_simple_left";

                    frame.state.set(
                        "assignment_strategy",
                        node.left instanceof PathNode ? "assign_path" : "assign_identifier"
                    );

                    return false;
                } else if (node.left instanceof MemberExpressionNode) {
                    frame.state.phase = "go_member_left";
                    frame.state.set(
                        "assignment_strategy",
                        "assign_member"
                    );
                    return false;
                }


                frame.state.phase = frame.exit;
                return false;
            },
            go_simple_left: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.left
                }, frame));

                frame.state.phase = "collect_left";

                return false;
            },
            collect_left: async () => {
                const left = frame.result_stack.pop();

                frame.state.set("left", left);

                frame.state.phase = "go_right";

                return false;
            },
            go_member_left: async () => {
                const _frame = new XM_Frame({
                    node: node.left
                }, frame);

                _frame.state.phase = "create_obj_n_prop";

                this.thread.stack.push(_frame);

                frame.state.phase = "collect_object";

                return false;
            },
            collect_object: async () => {
                const obj = frame.result_stack.pop() as any;
                frame.state.set("object", obj.object);
                frame.state.set("property", obj.property);

                const left = await obj.object.get({}, obj.property, []);
                frame.state.set("left", left);

                frame.state.phase = "go_right";
                return false;
            },
            go_right: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.right
                }, frame));

                frame.state.phase = "assign";

                return false;
            },
            assign: async () => {
                const right = frame.result_stack.pop();
                const left = frame.state.get("left");

                if (!(right instanceof Type)) {
                    frame.state.set("error", {
                        node,
                        error_code: ErrorCodes.runtime.STACK_UNDERFLOW,
                        reason: "Stack underflow during assignment.",
                        context: "Assignment expression evaluation",
                        example: "x = 5",
                        hint: "Ensure the right operand evaluates to a valid type",
                        expected: ["Type instance"]
                    })

                    frame.state.phase = "error";
                    return false;
                }

                let env = {
                    engine: this,
                    frame: frame.env,
                    module: frame.module
                };

                let result: Type<any>;

                try {
                    switch (node.operator) {
                        case "+=":
                            result = await left.add(env, right);
                            break;
                        default:
                            frame.state.set("error", {
                                node,
                                error_code: ErrorCodes.runtime.UNSUPPORTED_OPERATOR,
                                reason: `Unsupported assignment operator: ${node.operator}`,
                                context: "Assignment expression evaluation",
                                example: "x += 5",
                                hint: "Use supported operators: +=",
                                expected: ["+="]
                            })
                            frame.state.phase = "error";
                            return false;
                    }
                } catch (e: any) {
                    frame.state.phase = "error";

                    frame.state.set("error", {
                        node,
                        error_code: ErrorCodes.runtime.OPERATION_FAILED,
                        reason: `Operation failed: ${e.message}`,
                        context: "Assignment expression evaluation",
                        example: "x += 5",
                        hint: "Check operand types and values",
                        expected: ["Compatible operand types"]
                    });

                    return false;
                }

                frame.state.set("result", result);
                frame.state.phase = frame.state.get("assignment_strategy");

                return false;
            },
            assign_identifier: async () => {
                const identifier = node.left as IdentifierNode;

                const result = frame.state.get("result");

                frame.env.assign(identifier.name, result);

                frame.state.phase = frame.exit;

                return false;
            },
            assign_member: async () => {
                frame.state.phase = frame.exit;
                const result = frame.state.get("result");
                const object = frame.state.get("object");
                const property = frame.state.get("property");

                await object.set({}, property, result);

                frame.state.phase = frame.exit;
                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                const result = frame.state.get("result");
                frame.result = result;
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitStructInit(
        node: StructInitNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("struct", null);
                    frame.state.set("fields", {});
                    frame.state.set("instance", {});
                    frame.state.set("index", 0);
                    frame.state.set("index_body", 0);
                    frame.state.set("error", null);
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.name
                }, frame))

                frame.state.phase = "collect_struct";

                return false;
            },
            collect_struct: async () => {
                const struct = frame.result_stack.pop();

                if (!(struct instanceof StructNode)) {
                    frame.state.phase = "error";
                    return false;
                }

                frame.state.set("struct", struct);

                frame.state.phase = "loop_fields"

                return false;
            },
            loop_fields: async () => {
                const index = frame.state.get("index");

                if (index >= node.fields.length) {
                    frame.state.phase = "loop_body";
                    return false;
                }

                const field = node.fields[index];
                if (field.expression) {
                    frame.state.phase = "value";
                } else {
                    frame.state.phase = "key_is_value";
                }

                return false;
            },
            value: async () => {
                const index = frame.state.get("index");
                const field = node.fields[index];

                if (!field.expression) {
                    // shouldn't reach here
                    throw new Error("Internal error: No expression found in struct field");
                }

                this.thread.stack.push(new XM_Frame({
                    node: field.expression
                }, frame))

                frame.state.phase = "collect_value";

                return false;
            },
            key_is_value: async () => {
                const index = frame.state.get("index");
                const field = node.fields[index];

                this.thread.stack.push(new XM_Frame({
                    node: field.iden
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            collect_value: async () => {
                const index = frame.state.get("index");
                const field = node.fields[index];
                const value = frame.result_stack.pop();

                const fields = frame.state.get("fields");
                fields[field.iden.name] = value;

                frame.state.set("index", index + 1);

                frame.state.phase = "loop_fields";

                return false;
            },
            loop_body: async () => {
                const index = frame.state.get("index_body");
                const struct = frame.state.get("struct") as StructNode;

                if (index >= struct.body.length) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const member = struct.body[index];

                if (member instanceof FieldNode) {
                    frame.state.phase = "add_field";
                } else if (member instanceof FunctionDecNode) {
                    frame.state.phase = "add_member";
                }

                return false;
            },
            add_field: async () => {
                const index = frame.state.get("index_body");
                const struct = frame.state.get("struct") as StructNode;
                const provided_fields = frame.state.get("fields");

                const field = struct.body[index] as FieldNode;
                const field_name = field.field.name;

                const instance = frame.state.get("instance");
                instance[field_name] = provided_fields[field_name];

                frame.state.set("index_body", index + 1);

                frame.state.phase = "loop_body";

                return false;
            },
            add_member: async () => {
                const index = frame.state.get("index_body");
                const struct = frame.state.get("struct") as StructNode;

                const member = struct.body[index] as FunctionDecNode;
                const member_name = member.identifier.name;

                const instance = frame.state.get("instance");
                instance[member_name] = new FunctionType(member);

                frame.state.phase = "loop_body";

                frame.state.set("index_body", index + 1);

                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                const struct = frame.state.get("struct");

                frame.result = new StructType(
                    frame.state.get("instance"),
                    struct.name
                );

                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitStruct(
        node: StructNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    const new_module = new StructModule(
                        node.name,
                        frame.env
                    );

                    node.module.set("runtime", new_module);

                    frame.env.define(node.name, node);
                    frame.module.add_submodule(new_module);

                    // body could have been mutated by other passes. clean it
                    node.body = node.body.filter((m) => m instanceof FieldNode);
                }

                frame.state.phase = frame.exit;

                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitEnum(
        node: EnumNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("index", 0);
                    frame.state.set("env", 0);
                }

                const new_module = new EnumModule(
                    node.name,
                    null
                );

                frame.module.add_submodule(new_module);

                frame.state.set("env", new_module.env);

                frame.state.phase = "loop_body";

                return false;
            },
            loop_body: async () => {
                const index = frame.state.get("index");
                const env = frame.state.get("env");

                if (index >= node.body.length) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const variant = node.body[index];

                this.thread.stack.push(new XM_Frame({
                    node: variant,
                    env
                }, frame));

                frame.state.set("index", index + 1);

                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitEnumVariant(
        node: EnumVariantNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                let variant = node.value ?? new StringNode(null, node.name);

                const tagged = new TaggedNode(
                    null,
                    node.name,
                    variant
                )

                frame.env.define(node.name, tagged);

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitImpl(
        node: ImplNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("object", null);
                    frame.state.set("trait", null);
                    frame.state.set("entry", "runtime");

                    // filter out trait impls. They don't exist in a clean ImplNode state
                    node.body = node.body.filter((item) => !item.is_trait);
                }

                if (node.trait) {
                    this.thread.stack.push(new XM_Frame({
                        node: node.trait,
                    }, frame));

                    frame.state.phase = "collect_trait";
                    return false;
                }

                frame.state.phase = "to_iden";
                return false;
            },
            collect_trait: async () => {
                let trait = frame.result_stack.pop();
                frame.state.set("trait", trait);
                frame.state.phase = "is_trait";
                return false;
            },
            is_trait: async () => {
                let trait = frame.state.get("trait") as TraitNode;

                const def_methods = trait.body.filter((item) =>
                    item instanceof FunctionDecNode
                );

                node.body.push(...def_methods);

                frame.state.phase = "to_iden";
                return false;
            },
            to_iden: async () => {
                this.thread.stack.push(new XM_Frame({
                    node: node.iden,
                }, frame));

                frame.state.phase = "collect_object";

                return false;
            },
            collect_object: async () => {
                let obj = frame.result_stack.pop();
                frame.state.set("object", obj);

                if (obj instanceof StructNode) {
                    frame.state.phase = "is_struct";
                    return false;
                } else if (obj instanceof EnumModule) {
                    frame.state.phase = "is_enum";
                    return false;
                } else if (obj instanceof ModuleType) {
                    const _obj = obj.getValue();
                    frame.state.set("object", _obj);

                    if (_obj instanceof StructNode) {
                        frame.state.phase = "is_struct";
                        return false;
                    } else if (_obj instanceof EnumModule) {
                        frame.state.phase = "is_enum";
                        return false;
                    }
                }

                frame.state.phase = frame.exit;
                return false;
            },
            is_struct: async () => {
                let entry = frame.state.get("entry");
                let struct = frame.state.get("object") as StructNode;

                const module = struct.module.get(entry);

                for (const src of node.body) {
                    const mem_name = src.identifier.name;

                    if (
                        src instanceof FunctionDecNode
                    ) {
                        src.env.set(entry, frame.env);
                        src.module.set(entry, frame.module);
                        module.env.define(mem_name, src);
                        struct.body.push(src);
                    }
                }

                frame.state.phase = frame.exit;
                return false;
            },
            is_enum: async () => {
                let entry = frame.state.get("entry");
                let enm = frame.state.get("object") as EnumModule;

                // for (let [key, value] of enm.env.symbol_table.entries()) {
                //     if (value instanceof TaggedNode) {
                //         for (const src of node.body) {
                //             if (src instanceof MemberDecNode) {
                //                 src.env.set(entry, frame.env);
                //                 src.module.set(entry, frame.module);
                //                 value.members.push(src);
                //             }
                //         }
                //     }
                // }

                for (const src of node.body) {
                    if (
                        src instanceof FunctionDecNode
                    ) {
                        src.env.set(entry, frame.env);
                        src.module.set(entry, frame.module);
                        enm.env.define(src.identifier.name, src);
                    }
                }

                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitTrait(
        node: TraitNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.env.define(node.identifier.name, node);
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitMap(
        node: MapNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("key_values", {});
                    frame.state.set("key", null);
                    frame.state.set("value", null);
                    frame.state.set("index", 0);
                }

                frame.state.phase = "loopy";

                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");
                if (index > node.properties.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                const prop_node = node.properties[index];

                if (
                    prop_node.value == undefined &&
                    prop_node.key.type == "string"
                ) {
                    frame.state.phase = "value_is_key";
                    return false;
                } else if (prop_node.value != undefined) {
                    frame.state.phase = "value";
                    return false;
                }

                throw new Error("Internal error: Key is invalid");
            },
            value_is_key: async () => {
                const index = frame.state.get("index");
                const prop_node = node.properties[index];

                if (prop_node.key.type !== "string") {
                    // shouldn't reach here
                    throw new Error("Internal error: Key is not a string");
                }

                this.thread.stack.push(new XM_Frame({
                    node: new IdentifierNode(null, prop_node.key.value)
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            value: async () => {
                const index = frame.state.get("index");
                const prop_node = node.properties[index];

                if (prop_node.value == undefined) {
                    // shouldn't reach here
                    throw new Error("Internal error: value is undefined");
                }

                this.thread.stack.push(new XM_Frame({
                    node: prop_node.value
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            collect_value: async () => {
                const value = frame.result_stack.pop();

                frame.state.set("value", value);

                frame.state.phase = "make_key";

                return false;
            },
            make_key: async () => {
                const key = frame.result_stack.pop();

                frame.state.set("key", key);

                const index = frame.state.get("index");
                const prop_node = node.properties[index];

                if (prop_node.key.type == "string") {
                    frame.state.phase = "key";
                    return false;
                } else if (prop_node.key.type == "ast") {

                    this.thread.stack.push(new XM_Frame({
                        node: prop_node.key.value
                    }, frame));

                    frame.state.phase = "key_is_value";
                    return false;
                }

                throw new Error("Internal error: Key is invalid");
            },
            key: async () => {
                const index = frame.state.get("index");
                const prop_node = node.properties[index];

                if (prop_node.key.type !== "string") {
                    // shouldn't reach here
                    throw new Error("Internal error: Key is not a string");
                }

                frame.state.set("key", prop_node.key.value);

                frame.state.phase = "make_pair";

                return false;
            },
            key_is_value: async () => {
                const key = frame.result_stack.pop();

                if (!(key instanceof StringType)) {
                    throw new Error("Internal error: Key is not a string");
                }

                frame.state.set("key", key.getValue());

                frame.state.phase = "make_pair";

                return false;
            },
            make_pair: async () => {
                const key = frame.state.get("key");
                const value = frame.state.get("value");

                const kv = frame.state.get("key_values");

                kv[key] = value;

                frame.state.set("key", null);
                frame.state.set("value", null);

                frame.state.set("index", frame.state.get("index") + 1);

                frame.state.phase = "loopy";

                return false;
            },
            done: async () => {
                frame.result = new MapType(frame.state.get("key_values"));
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitArray(
        node: ArrayNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("elements", []);
                    frame.state.set("index", 0);
                }

                frame.state.phase = "loopy";

                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");
                if (index > node.elements.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.elements[index]
                }, frame));

                frame.state.phase = "collect_element";

                return false;
            },
            collect_element: async () => {
                const element = frame.result_stack.pop();
                frame.state.get("elements").push(element);

                frame.state.set("index", frame.state.get("index") + 1);

                frame.state.phase = "loopy";
                return false;
            },
            done: async () => {
                frame.result = new ArrayType(frame.state.get("elements"));
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitTuple(
        node: TupleNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("values", []);
                    frame.state.set("index", 0);
                }

                frame.state.phase = "loopy";

                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");
                if (index > node.values.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.values[index]
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            collect_value: async () => {
                const value = frame.result_stack.pop();

                frame.state.get("values").push(value);

                frame.state.set("index", frame.state.get("index") + 1);

                frame.state.phase = "loopy";
                return false;
            },
            done: async () => {
                frame.result = new TupleType(frame.state.get("values"));
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitSet(
        node: SetNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("values", []);
                    frame.state.set("index", 0);
                }

                frame.state.phase = "loopy";

                return false;
            },
            loopy: async () => {
                const index = frame.state.get("index");
                if (index > node.values.length - 1) {
                    frame.state.phase = frame.exit;
                    return false;
                }

                this.thread.stack.push(new XM_Frame({
                    node: node.values[index]
                }, frame));

                frame.state.phase = "collect_value";

                return false;
            },
            collect_value: async () => {
                const value = frame.result_stack.pop();

                frame.state.get("values").push(value);

                frame.state.set("index", frame.state.get("index") + 1);

                frame.state.phase = "loopy";
                return false;
            },
            done: async () => {
                frame.result = new SetType(frame.state.get("values"));
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitAlreadyInit(
        node: AlreadyInitNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.result = node.lugha_type;
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitNumber(
        node: NumberNode,
        { frame }: { frame: XM_Frame }
    ): Promise<boolean> {

        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.result = new NumberType(node.value);
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }


    async visitUnit(
        node: UnitNode,
        { frame }: { frame: XM_Frame }
    ): Promise<boolean> {

        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.result = new UnitType();
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitBoolean(
        node: BooleanNode,
        { frame }: { frame: XM_Frame }
    ): Promise<boolean> {

        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.result = new BoolType(node.value);
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }

    async visitString(
        node: StringNode,
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                frame.result = new StringType(node.value);
                frame.state.phase = frame.exit;
                return false;
            },
            done: async () => {
                frame.state.cleanup();
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }
}

// yet to implement
// range expressions
// calling main
// handling inbuilt async