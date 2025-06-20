import { builtin } from "../types";

export const init_io = () => {
    builtin["__print__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        exec: (args: Array<any>) => {
            console.log(args[0]);
            return 0;
        },
    }
}

init_io();