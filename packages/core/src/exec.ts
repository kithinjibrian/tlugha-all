import {
    BlockNode,
    Builtin,
    create_object,
    FunctionDecNode,
    IdentifierNode,
    Module,
    Token,
    VariableNode
} from "./types";

export function id(length = 21) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const index = Math.floor(Math.random() * characters.length);
        result += characters[index];
    }
    return result;
}

export const add_builtins = async (builtin: Record<string, Builtin>, { root, }: { root: Module }) => {
    let module = new Module("builtin");

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
                module.frame.define(key, inbuiltFunction);
            } else if (value.type == "variable") {
                module.frame.define(key, create_object(value.value));
            }
        })
}