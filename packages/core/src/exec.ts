import {
    BlockNode,
    Builtin,
    create_object,
    FunctionDecNode,
    IdentifierNode,
    init_num,
    Module,
} from "./types";

export const add_builtins = async (builtin: Record<string, Builtin>, { root, }: { root: Module }) => {
    let module = new Module(
        "builtin",
        null,
        "builtin",
        true
    );

    root.add_submodule(module);

    Object.entries(builtin)
        .map(([key, value]) => {
            if (value.type == "function") {
                const inbuiltFunction = new FunctionDecNode(
                    null,
                    new IdentifierNode(null, key),
                    undefined,
                    new BlockNode(null, []),
                    true,
                    value.async
                );
                module.env.define(key, inbuiltFunction);
            } else if (value.type == "variable") {
                module.env.define(key, create_object(value.value));
            }
        });
}