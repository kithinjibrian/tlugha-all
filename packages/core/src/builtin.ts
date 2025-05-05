import axios from "axios"
import { Type, StringType, Frame, NumberType, Engine } from "./types"

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
        has_callback: true,
        async: true,
        exec: async (args: any[]) => {

            const engine = args[0] as Engine;

            const frame = new Frame();

            await engine.execute_function(
                args[2],
                [new NumberType(90)],
                frame,
                args[1]
            )

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
    }
}