import { StoreX } from "./storex";

export enum Consts {
    START = "__START__",
    END = "__END__"
}

type Label = string;
type ExecFn<S extends object> = (state: StoreX<S>) => void | Promise<any>;
type CondFn<S extends object> = (state: StoreX<S>) => Promise<string>;

export class Node<S extends object> {
    constructor(
        public label: Label,
        public exec_fn: ExecFn<S>,
    ) { }
}

type Edge<S extends object> = {
    type: "forward",
    to: Label,
} | {
    type: "conditional",
    from: Label,
    condition: CondFn<S>,
    branches: Map<string, Label>
}

export class GraphExecutionError extends Error {
    constructor(message: string, public node?: Label, public execution_path?: Label[]) {
        super(message);
        this.name = 'GraphExecutionError';
    }
}

export class Graph<S extends object> {
    public store: StoreX<S>;
    public log: boolean = false;
    private max_steps: number = 1000;

    constructor(
        {
            store,
            log,
            max_steps = 1000
        }: {
            store: StoreX<S>,
            log?: boolean,
            max_steps?: number
        },
        public nodes: Map<Label, Node<S>> = new Map([
            [Consts.START, new Node(Consts.START, () => { })],
            [Consts.END, new Node(Consts.END, () => { })],
        ]),
        public edges: Map<Label, Array<Edge<S>>> = new Map(),
    ) {
        this.store = store;
        this.log = log ?? false;
        this.max_steps = max_steps;
    }

    private wrapper(fn: ExecFn<S>): ExecFn<S> {
        return async (store: StoreX<S>) => {
            await fn(store);
        };
    }

    public add_node(label: Label, exec_fn: ExecFn<S>) {
        this.nodes.set(
            label,
            new Node(label, this.wrapper(exec_fn))
        );
        return this;
    }

    public add_edge(from: Label, to: Label) {
        if (!this.edges.has(from)) {
            this.edges.set(from, []);
        }
        this.edges.get(from)!.push({
            type: "forward",
            to,
        });
        return this;
    }

    public add_conditional_edge(
        from: Label,
        condition: CondFn<S>,
        branches: Map<string, Label>
    ) {
        if (!this.edges.has(from)) {
            this.edges.set(from, []);
        }
        this.edges.get(from)!.push({
            type: "conditional",
            from,
            condition,
            branches
        });
        return this;
    }

    // Validate graph structure
    public validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check if START and END nodes exist
        if (!this.nodes.has(Consts.START)) {
            errors.push("START node is missing");
        }
        if (!this.nodes.has(Consts.END)) {
            errors.push("END node is missing");
        }

        // Check for unreachable nodes
        const reachable = new Set<Label>();
        const to_visit = [Consts.START as Label];

        while (to_visit.length > 0) {
            const current = to_visit.pop()!;
            if (reachable.has(current)) continue;

            reachable.add(current);
            const edges = this.edges.get(current) || [];

            for (const edge of edges) {
                if (edge.type === "forward") {
                    to_visit.push(edge.to);
                } else if (edge.type === "conditional") {
                    for (const target of edge.branches.values()) {
                        to_visit.push(target);
                    }
                }
            }
        }

        // Find unreachable nodes
        for (const node_label of this.nodes.keys()) {
            if (!reachable.has(node_label)) {
                errors.push(`Node '${node_label}' is unreachable`);
            }
        }

        // Check for dangling edges
        for (const [from, edge_list] of this.edges.entries()) {
            if (!this.nodes.has(from)) {
                errors.push(`Edge references non-existent node '${from}'`);
            }

            for (const edge of edge_list) {
                if (edge.type === "forward") {
                    if (!this.nodes.has(edge.to)) {
                        errors.push(`Edge from '${from}' references non-existent node '${edge.to}'`);
                    }
                } else if (edge.type === "conditional") {
                    for (const [condition, target] of edge.branches.entries()) {
                        if (!this.nodes.has(target)) {
                            errors.push(`Conditional edge from '${from}' (condition: '${condition}') references non-existent node '${target}'`);
                        }
                    }
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    public async run(current = Consts.START as Label) {
        // Validate graph before execution
        const validation = this.validate();
        if (!validation.valid) {
            throw new GraphExecutionError(
                `Graph validation failed: ${validation.errors.join(', ')}`
            );
        }

        const execution_path: Label[] = [];
        let steps = 0;

        while (current !== Consts.END) {
            if (steps >= this.max_steps) {
                throw new GraphExecutionError(
                    `Maximum steps (${this.max_steps}) exceeded. Possible infinite loop detected.`,
                    current,
                    execution_path
                );
            }

            const node = this.nodes.get(current);
            if (!node) {
                throw new GraphExecutionError(
                    `Node '${current}' not found`,
                    current,
                    execution_path
                );
            }

            execution_path.push(current);
            steps++;

            try {
                await node.exec_fn(this.store);
            } catch (error) {
                throw new GraphExecutionError(
                    `Error executing node '${current}': ${error instanceof Error ? error.message : String(error)}`,
                    current,
                    execution_path
                );
            }

            if (this.log) {
                console.log(`Executed: ${current} (step ${steps})`);
            }

            const edges: Array<Edge<S>> = this.edges.get(current) || [];
            let next_node: Label | null = null;

            for (const edge of edges) {
                if (edge.type === "forward") {
                    next_node = edge.to;
                    break;
                } else if (edge.type === "conditional") {
                    try {
                        const condition_result = await edge.condition(this.store);
                        if (edge.branches.has(condition_result)) {
                            next_node = edge.branches.get(condition_result)!;
                            if (this.log) {
                                console.log(`Condition '${condition_result}' -> ${next_node}`);
                            }
                            break;
                        }
                    } catch (error) {
                        throw new GraphExecutionError(
                            `Error evaluating condition for node '${current}': ${error instanceof Error ? error.message : String(error)}`,
                            current,
                            execution_path
                        );
                    }
                }
            }

            if (next_node === null) {
                throw new GraphExecutionError(
                    `No valid transition found from node '${current}'`,
                    current,
                    execution_path
                );
            }

            current = next_node;
        }

        // Execute END node
        const end_node = this.nodes.get(Consts.END);
        if (!end_node) {
            throw new GraphExecutionError(
                `END node not found`,
                Consts.END,
                execution_path
            );
        }

        try {
            await end_node.exec_fn(this.store);
            steps++;
        } catch (error) {
            throw new GraphExecutionError(
                `Error executing END node: ${error instanceof Error ? error.message : String(error)}`,
                Consts.END,
                execution_path
            );
        }

        if (this.log) {
            console.log(`Executed: ${Consts.END} (step ${steps})`);
        }

        execution_path.push(Consts.END);

        return {
            execution_path,
            steps_taken: steps
        };
    }

    // Utility method to get a visual representation of the graph
    public to_dot(): string {
        let dot = 'digraph G {\n';
        dot += '  rankdir=TB;\n';

        // Add nodes
        for (const [label, node] of this.nodes.entries()) {
            const shape = label === Consts.START || label === Consts.END ? 'ellipse' : 'box';
            dot += `  "${label}" [shape=${shape}];\n`;
        }

        // Add edges
        for (const [from, edge_list] of this.edges.entries()) {
            for (const edge of edge_list) {
                if (edge.type === "forward") {
                    dot += `  "${from}" -> "${edge.to}";\n`;
                } else if (edge.type === "conditional") {
                    for (const [condition, target] of edge.branches.entries()) {
                        dot += `  "${from}" -> "${target}" [label="${condition}"];\n`;
                    }
                }
            }
        }

        dot += '}';
        return dot;
    }
}