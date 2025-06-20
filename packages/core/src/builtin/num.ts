import { Builtin, builtin } from "../types";

export const init_num = () => {
    builtin["__num_add__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] + args[1];
        },
    }

    builtin["__num_sub__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] - args[1];
        },
    }

    builtin["__num_mul__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] * args[1];
        },
    }

    builtin["__num_div__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] / args[1];
        },
    }

    builtin["__num_mod__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] % args[1];
        },
    }

    builtin["__num_lt__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] < args[1];
        },
    }

    builtin["__num_lte__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] <= args[1];
        },
    }

    builtin["__num_gt__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] > args[1];
        },
    }

    builtin["__num_gte__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] >= args[1];
        },
    }

    builtin["__num_eq__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] === args[1];
        },
    }

    builtin["__num_neq__"] = {
        type: "function",
        signature: "(num, num) -> bool",
        exec: (args: Array<any>) => {
            return args[0] !== args[1];
        },
    }

    builtin["__num_sqrt__"] = {
        type: "function",
        signature: "(num) -> num",
        exec: (args: Array<any>) => {
            return Math.sqrt(args[0]);
        },
    }

    builtin["__num_abs__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.abs(args[0]);
        },
    }

    builtin["__num_ceil__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.ceil(args[0]);
        },
    }

    builtin["__num_floor__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.floor(args[0]);
        },
    }

    builtin["__num_round__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.round(args[0]);
        },
    }

    builtin["__num_trunc__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.trunc(args[0]);
        },
    }

    builtin["__num_pow__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return Math.pow(args[0], args[1]);
        },
    }
};

init_num();