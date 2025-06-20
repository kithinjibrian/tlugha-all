import axios from "axios"
import { Type } from "./types"
import { Panic } from "./error/panic"

export type Builtin =
    {
        type: "function",
        async?: boolean,
        has_callback?: boolean,
        signature: string,
        filter?: (args: Type<any>[]) => any,
        exec: (args: Type<any>[]) => any
    }
    | {
        type: "variable",
        signature: string,
        value: any
    }

export const builtin: Record<string, Builtin> = {
    __version__: {
        type: "variable",
        signature: "str",
        value: "Lugha v1.0.0"
    },
    __now__: {
        type: "function",
        signature: "() -> date",
        exec: (args: any[]) => {
            return new Date();
        }
    },
    __re_test__: {
        type: "function",
        signature: "(str, str) -> bool",
        exec: (args: any[]) => {
            const regex = new RegExp(args[0]);
            return regex.test(args[1]);
        }
    },
    __panic__: {
        type: "function",
        signature: "(str) -> unit",
        exec: (args: any[]) => {
            throw new Panic(`PANIC:
${args[0]}
`);
        }
    },
    __http_get__: {
        type: "function",
        async: true,
        signature: "<T>(url: str, T) -> str",
        exec: async (args: any[]) => {
            try {
                const response: Response = await fetch(args[0]);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader: ReadableStreamDefaultReader<Uint8Array> = response.body!.getReader();

                while (true) {
                    const { value, done }: ReadableStreamReadResult<Uint8Array> = await reader.read();

                    if (done) {
                        console.log('Stream complete');
                        break;
                    }

                    if (value) {
                        console.log('Received chunk:', value);
                    }
                }

                return "kithinji";
            } catch (e: any) {
                throw e;
            }
        }
    },
    __http_post__: {
        type: "function",
        async: true,
        signature: "<D, T>(str, D, T) -> str",
        exec: async (args: any[]) => {
            try {
                const res = await axios.post(args[0], args[1], args[2]);
                const { config, request, ...rest } = res;
                return JSON.stringify(rest);
            } catch (e: any) {
                throw e;
            }
        }
    }
}

/*
const res = await axios.get(args[0], args[1]);
                const { config, request, ...rest } = res;
                return JSON.stringify(rest);
*/