export declare class Task {
    fn: Function;
    context: any;
    args: any[];
    callbacks: Function[];
    constructor(fn: Function, context: any, args?: any[], callbacks?: Function[]);
    execute(): void;
    then(callback: Function): this;
}
export declare class EventLoop {
    taskQueue: Task[];
    microtaskQueue: Task[];
    isRunning: boolean;
    private static instance;
    constructor(taskQueue?: Task[], microtaskQueue?: Task[], isRunning?: boolean);
    static get(): EventLoop;
    enqueue(task: Task): void;
    run(): Promise<void>;
    private hasWork;
}
//# sourceMappingURL=event.d.ts.map