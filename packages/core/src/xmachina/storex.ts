type mutation<S> = (state: S, value: any) => void

export class StoreX<S> {
    public state: S;
    public mutations: Map<string, mutation<S>>;
    private subscribers: Array<(mutationName: string, state: S, payload: any) => void> = [];

    constructor({
        state,
        mutations
    }: {
        state: S,
        mutations: Map<string, mutation<S>>
    }) {
        this.state = state;
        this.mutations = mutations;
    }

    public commit(name: string, value: any) {
        const mutation = this.mutations.get(name);

        if (mutation) {
            mutation(this.state, value);
        }

        this.subscribers.forEach(callback => {
            try {
                callback(name, this.state, value);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });

        return true;
    }

    public subscribe(callback: (mutationName: string, state: S, payload: any) => void): () => void {
        this.subscribers.push(callback);

        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }

    public getState(): S {
        return this.state;
    }

    public hasMutation(name: string): boolean {
        return this.mutations.has(name);
    }

    public getMutationNames(): string[] {
        return Array.from(this.mutations.keys());
    }

    public addMutation(name: string, mutation: mutation<S>): void {
        if (this.mutations.has(name)) {
            console.warn(`Mutation '${name}' already exists and will be overwritten`);
        }
        this.mutations.set(name, mutation);
    }

    public removeMutation(name: string): boolean {
        return this.mutations.delete(name);
    }
}