import { builtin, XMachina } from "../types";

export const init_utils = () => {
    builtin["__write_out__"] = {
        type: "function",
        signature: "(num, num) -> num",
        has_callback: true,
        exec: (args: Array<any>) => {
            const xmachina = args[0] as XMachina;

            xmachina.out = args[1];

            return 0;
        },
    }
}

init_utils();