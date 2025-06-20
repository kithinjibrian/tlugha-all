import { builtin, result, StringType, Type, } from "../types";

export const init_map = () => {
    builtin["__map_get__"] = {
        type: "function",
        has_callback: true,
        signature: "<T, E>(T, E) -> num",
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            const value = args[1].value[args[2].value];

            if (value === undefined) {
                return result(args[0], null, new StringType(`Key '${args[2].value}' doesn't exist.`));
            }

            return result(args[0], value, null);
        },
    }

    builtin["__map_set__"] = {
        type: "function",
        signature: "<T, E>(T, E) -> num",
        filter: (args: Type<any>[]) => args.map(i => i),
        exec: (args: Array<any>) => {
            const map = args[0];
            const key = args[1].value;
            const value = args[2];

            map.value[key] = value;

            return 0;
        },
    }
};

init_map();