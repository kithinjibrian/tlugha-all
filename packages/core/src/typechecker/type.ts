import { ASTNode } from "../types";

export interface Operations {
    get?: (key: string) => Promise<any>;
}

export abstract class Base {
    public name: string;
    public types: Record<string, Types>
    protected readonly operations: Operations;

    constructor(
        name: string,
        types: Record<string, Types>,
        operations: Operations
    ) {
        this.name = name;
        this.types = types;
        this.operations = operations;
    }

    async get(key: string): Promise<any> {
        if (this.operations.get) {
            return await this.operations.get(key);
        }
        throw new Error(`Operation 'get' not supported for type ${this.name}`);
    }
}

export class NumberTypes extends Base {
    private static instances: NumberTypes;

    private constructor(
        types: Record<string, Types>,
        operations: Operations
    ) {
        super("NumberTypes", types, operations)
    }

    public static get_instance(): NumberTypes {
        if (!this.instances) {
            const types: Record<string, Types> = {
                "sqrt": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "abs": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "ceil": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "floor": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "round": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "trunc": tfun(
                    tcon_ex("Array", [], null),
                    tcon("num", null),
                    null
                ),
                "pow": tfun(
                    tcon_ex("Array", [tcon("num", null)], null),
                    tcon("num", null),
                    null
                ),
            }

            this.instances = new NumberTypes({}, {
                get: async (property: string) => {
                    return types[property]
                }
            });
        }

        return this.instances;
    }
}

export class StringTypes extends Base {
    private static instances: StringTypes;

    private constructor(
        types: Record<string, Types>,
        operations: Operations
    ) {
        super("StringTypes", types, operations)
    }

    public static get_instance(): StringTypes {
        if (!this.instances) {
            const types: Record<string, Types> = {
                "format": tfun(
                    tcon_ex("Array", [], null),
                    tcon("str", null),
                    null
                )
            }

            this.instances = new StringTypes({}, {
                get: async (property: string) => {
                    return types[property]
                }
            });
        }

        return this.instances;
    }
}

export class TupleTypes extends Base {
    private static instances: TupleTypes;

    private constructor(
        types: Record<string, Types>,
        operations: Operations
    ) {
        super("TupleTypes", types, operations)
    }

    public static get_instance(): TupleTypes {
        if (!this.instances) {
            const types: Record<string, Types> = {
                "is_empty": tfun(
                    tcon_ex("Array", [], null),
                    tcon("bool", null),
                    null
                )
            }

            this.instances = new TupleTypes({}, {
                get: async (property: string) => {
                    return types[property]
                }
            });
        }

        return this.instances;
    }
}

export class ArrayTypes extends Base {
    private static instances: ArrayTypes;

    private constructor(
        types: Record<string, Types>,
        operations: Operations
    ) {
        super("ArrayTypes", types, operations)
    }

    public static get_instance(): ArrayTypes {
        if (!this.instances) {
            const types: Record<string, Types> = {
                "is_empty": tfun(
                    tcon_ex("Array", [], null),
                    tcon("bool", null),
                    null
                )
            }

            this.instances = new ArrayTypes({}, {
                get: async (property: string) => {
                    return types[property]
                }
            });
        }

        return this.instances;
    }
}

export type Types =
    | {
        tag: "TVar";
        tvar: string;
        ast: ASTNode | null,
        methods?: Base
    }
    | {
        tag: "TCon";
        tcon: {
            name: string;
            types: Types[];
        };
        ast: ASTNode | null;
        methods?: Base
    }
    | {
        tag: "TRec";
        trec: {
            name: string;
            types: Record<string, Types>;
        },
        ast: ASTNode | null,
        methods?: Base
    }
    | {
        tag: "TSum";
        tsum: {
            name: string;
            variants: Record<string, Types>;
        },
        ast: ASTNode | null,
        methods?: Base
    }


export function tcon(type: string, ast: ASTNode | null, methods?: any): Types {
    return {
        tag: "TCon",
        tcon: {
            name: type,
            types: []
        },
        ast,
        methods
    };
}

export function tfun(params: Types, ret: Types, ast: ASTNode | null): Types {
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

export function tcon_ex(name: string, types: Types[], ast: ASTNode | null, methods?: any): Types {
    return {
        tag: "TCon",
        tcon: {
            name: name,
            types: types
        },
        ast,
        methods
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