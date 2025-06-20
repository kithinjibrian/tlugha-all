import { Builtin, builtin, XMachina } from "../types";
import { Engine } from "./format/engine";
import { Lexer } from "./format/lexer";
import { Parser } from "./format/parser";

export const init_str = () => {
    builtin["__str_add__"] = {
        type: "function",
        signature: "(str, str) -> str",
        exec: (args: Array<any>) => {
            return args[0] + args[1];
        },
    }

    builtin["__str_eq__"] = {
        type: "function",
        signature: "(str, str) -> bool",
        exec: (args: Array<any>) => {
            return args[0] === args[1];
        },
    }

    builtin["__str_neq__"] = {
        type: "function",
        signature: "(str, str) -> bool",
        exec: (args: Array<any>) => {
            return args[0] !== args[1];
        },
    }

    builtin["__str_length__"] = {
        type: "function",
        signature: "(str) -> num",
        exec: (args: Array<any>) => {
            return args[0].length;
        },
    }

    builtin["__str_format__"] = {
        type: "function",
        has_callback: true, // trick xmachina to handle over its instance
        signature: "(str, str) -> bool",
        exec: (args: Array<any>) => {
            const stack = (args[0] as XMachina).thread.stack;
            const top_frame = stack[stack.length - 1];
            const env = top_frame.env;

            const lexer = new Lexer(args[1]);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            const engine = new Engine(ast, env, args[2]);
            const res = engine.run();

            return res;
        },
    }
};

init_str();