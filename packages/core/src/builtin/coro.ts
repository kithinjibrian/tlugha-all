import { CoroType } from "../objects/coro";
import { AlreadyInitNode, builtin, CallExpressionNode, EnumType, FunctionDecNode, IdentifierNode, result, StringType, Thread, thread_state, Type, UnitType, XM_Frame, XMachina, } from "../types";

export const init_coro = () => {
    builtin["__coro_create__"] = {
        type: "function",
        has_callback: true,
        signature: "<T, E>(T, E) -> num",
        exec: (args: Array<any>) => {
            const xmachina = args[0] as XMachina;
            const thread = xmachina.thread.launch();
            thread.state = thread_state.CREATED;

            // console.log("thread", thread)

            const frame = new XM_Frame({
                node: args[1],
                env: args[1].env.get(xmachina.phase),
                module: args[1].module.get(xmachina.phase),
            }, null);

            frame.state.phase = xmachina.phase;
            frame.state.namespace = xmachina.phase;

            thread.stack.push(frame);

            return new CoroType(args[1], xmachina, thread);
        },
    }

    builtin["__coro_resume__"] = {
        type: "function",
        signature: "(str) -> unit",
        async: true,
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: async (args: any[]) => {
            const xmachina = args[0].xmachina as XMachina;
            const thread = args[0].thread as Thread;
            const fun = args[0].value as FunctionDecNode;

            if (thread.state == thread_state.DEAD) {
                return new EnumType("Dead", new UnitType())
            }

            if (thread.state == thread_state.CREATED) {
                thread.stack.push(new XM_Frame({
                    node: new CallExpressionNode(
                        null,
                        new IdentifierNode(
                            null,
                            fun.identifier.name
                        ),
                        [new AlreadyInitNode(args[1])]
                    ),
                    env: fun.env.get(xmachina.phase),
                    module: fun.module.get(xmachina.phase),
                    allow_yield: true,
                    allow_return: true
                }, null))
            }

            const yield_frame = thread.stack[thread.stack.length - 1];

            yield_frame.result = args[1];

            thread.state = thread_state.RUNNING;

            xmachina.thread = thread;

            // this value is leaking
            return 10
        }
    }
};

init_coro();