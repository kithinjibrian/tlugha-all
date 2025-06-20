import { builtin, result, StringType, Type, } from "../types";

export const init_arr = () => {
    builtin["__arr_push__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            const n = args[0].value.push(args[1]);
            return n;
        },
    }

    builtin["__arr_pop__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        has_callback: true,
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            const n = args[1].value.pop();

            if (n === undefined) {
                return result(args[0], null, new StringType("Array is empty."));
            }

            return result(args[0], n, null);
        },
    }

    builtin["__arr_length__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            return args[0].value.length;
        },
    }

    builtin["__arr_is_empty__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            return args[0].value.length == 0;
        },
    }
};

init_arr();