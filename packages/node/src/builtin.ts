import axios from "axios"
import { spawn } from "child_process"
import { Type, StringType } from "@kithinji/tlugha-core"
import { readFile, writeFile } from "fs/promises"

export type Builtin =
    {
        type: "function",
        async?: boolean,
        signature: string,
        filter?: (args: Type<any>[]) => any,
        exec: (args: Type<any>[]) => any
    }
    | {
        type: "variable",
        signature?: string,
        value: any
    }

export const builtin: Record<string, Builtin> = {
    __version__: {
        type: "variable",
        signature: "string",
        value: "Lugha v1.0.0"
    },
    __now__: {
        type: "function",
        signature: "<T, U>(args: T) -> U",
        exec: (args: any[]) => {
            return new Date();
        }
    },
    __print__: {
        type: "function",
        signature: "<T, U>(args: T) -> U",
        filter: (args) => args.map(i => i),
        exec: (args: any[]) => {
            let formatted = args[0].value;
            const values = args[1];

            let index = 0;
            formatted = formatted.replace(/\{\}/g, () => {
                const val = index < values.value.length ? values.value[index++] : new StringType("{}");
                return val.str();
            });

            console.log(formatted);

            return null;
        }
    },
    __set_timeout__: {
        type: "function",
        signature: "<T, U>(args: T) -> U",
        filter: (args) => args.map(i => i),
        exec: (args: any[]) => {
            console.log(args);
            return null;
        }
    },
    __http_get__: {
        type: "function",
        async: true,
        signature: "<T, U>(args: T) -> U",
        exec: async (args: any[]) => {
            try {
                const res = await axios.get(args[0], args[1]);
                const { config, request, ...rest } = res;
                return rest;
            } catch (e: any) {
                throw e;
            }
        }
    },
    __http_post__: {
        type: "function",
        async: true,
        signature: "<T, U>(args: T) -> U",
        exec: async (args: any[]) => {
            try {
                const res = await axios.post(args[0], args[1], args[2]);
                const { config, request, ...rest } = res;
                return rest;
            } catch (e: any) {
                throw e;
            }
        }
    },
    __read__: {
        type: "function",
        async: true,
        signature: "<T, U>(args: T) -> U",
        exec: async (args: any[]) => {
            try {
                const res = await readFile(args[0], args[1]);
                return res;
            } catch (e: any) {
                throw e;
            }
        }
    },
    __write__: {
        type: "function",
        async: true,
        signature: "<T, U>(args: T) -> U",
        exec: async (args: any[]) => {
            try {
                await writeFile(args[0], args[1]);
            } catch (e: any) {
                throw e;
            }
        }
    },
    __shell__: {
        type: "function",
        async: true,
        signature: "<T, U>(args: T) -> U",
        exec: async (args: any[]) => {
            return new Promise((resolve, reject) => {
                const process = spawn(args[0], { shell: true });

                let output = '';
                let error = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    error += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(new Error(error || `Process exited with code ${code}`));
                    }
                });
            });
        }
    }
}