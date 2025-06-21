import { builtin } from "../types";

export const init_bool = () => {
    builtin["__bool_and__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] && args[1];
        },
    }

    builtin["__bool_or__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] || args[1];
        },
    }

    builtin["__bool_not__"] = {
        type: "function",
        signature: "(num) -> num",
        exec: (args: Array<any>) => {
            return !args[0];
        },
    }

    builtin["__bool_eq__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] === args[1];
        },
    }

    builtin["__bool_neq__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] != args[1];
        },
    }

    builtin["__bool_xor__"] = {
        type: "function",
        signature: "(num, num) -> num",
        exec: (args: Array<any>) => {
            return args[0] ^ args[1];
        },
    }
}

init_bool();