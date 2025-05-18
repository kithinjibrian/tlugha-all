import { ASTNode } from "../types";

export type Types =
    | {
        tag: "TVar";
        tvar: string;
        ast: ASTNode | null
    }
    | {
        tag: "TCon";
        tcon: {
            name: string;
            types: Types[];
        };
        ast: ASTNode | null
    }
    | {
        tag: "TRec";
        trec: {
            name: string;
            types: Record<string, Types>;
        },
        ast: ASTNode | null
    };


export function tcon(type: string, ast: ASTNode): Types {
    return {
        tag: "TCon",
        tcon: {
            name: type,
            types: []
        },
        ast
    };
}

export function tfun(params: Types, ret: Types, ast: ASTNode): Types {
    if (params.tag == "TCon" && params.tcon.name == "Array") {
        let p = params.tcon.types;

        return {
            tag: "TCon",
            tcon: {
                name: "->",
                types: [...p, ret]
            },
            ast
        }
    }

    throw new Error("Bad tfun arguments");
}

export function tcon_ex(name: string, types: Types[], ast: ASTNode): Types {
    return {
        tag: "TCon",
        tcon: {
            name: name,
            types: types
        },
        ast
    }
}

let counter = 0;

export function tvar(
    ast: ASTNode | null,
    name?: string,
): Types {
    return {
        tag: "TVar",
        tvar: name ?? `T${counter++}`,
        ast
    };
}