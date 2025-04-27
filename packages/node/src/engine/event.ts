export class Task {
    constructor(
        public fn: Function,
        public context: any,
        public args: any[] = [],
        public callbacks: Function[] = []
    ) {
    }

    execute() {
        const result = this.fn.apply(this.context, this.args);
        this.callbacks.forEach(callback => callback(result));
    }

    then(callback: Function) {
        this.callbacks.push(callback);
        return this;
    }
}

export class EventLoop {
    private static instance: EventLoop;

    constructor(
        public taskQueue: Task[] = [],
        public microtaskQueue: Task[] = [],
        public isRunning: boolean = false
    ) { }

    public static get(): EventLoop {
        if (!EventLoop.instance) {
            EventLoop.instance = new EventLoop();
        }
        return EventLoop.instance;
    }

    enqueue(task: Task) {
        this.taskQueue.push(task);
        if (!this.isRunning) {
            this.run();
        }
    }

    async run() {
        this.isRunning = true;
        try {
            while (this.hasWork()) {
                while (this.microtaskQueue.length > 0) {
                    const microtask = this.microtaskQueue.shift()!;
                    microtask.execute();
                }

                if (this.taskQueue.length > 0) {
                    const task = this.taskQueue.shift()!;
                    task.execute();
                }

                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } finally {
            this.isRunning = false;
        }
    }

    private hasWork(): boolean {
        return (
            this.taskQueue.length > 0 ||
            this.microtaskQueue.length > 0
        );
    }
}