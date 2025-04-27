import {
    BlockNode,
    Builtin,
    create_object,
    FunctionDecNode,
    IdentifierNode,
    Module,
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
                    new IdentifierNode(key),
                    undefined,
                    new BlockNode([]),
                    true,
                    value.async
                );
                module.frame.define(key, inbuiltFunction);
            } else if (value.type == "variable") {
                const inbuiltVariable = new VariableNode(
                    new IdentifierNode(key),
                    true,
                    false,
                    undefined,
                    create_object(value.value)
                );

                module.frame.define(key, inbuiltVariable);
            }
        })
}