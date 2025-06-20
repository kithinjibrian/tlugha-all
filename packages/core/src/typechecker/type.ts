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
                    tcon_ex("Array", []),
                    tcon("num"),
                ),
                "abs": tfun(
                    tcon_ex("Array", []),
                    tcon("num"),
                ),
                "ceil": tfun(
                    tcon_ex("Array", []),
                    tcon("num"),
                ),
                "floor": tfun(
                    tcon_ex("Array", []),
                    tcon("num")
                ),
                "round": tfun(
                    tcon_ex("Array", []),
                    tcon("num"),
                ),
                "trunc": tfun(
                    tcon_ex("Array", []),
                    tcon("num"),
                ),
                "pow": tfun(
                    tcon_ex("Array", [tcon("num")]),
                    tcon("num"),
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
                    tcon_ex("Array", [
                        tvar([]),
                    ]),
                    tcon("str"),
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
                    tcon_ex("Array", []),
                    tcon("bool"),
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
                    tcon_ex("Array", []),
                    tcon("bool"),
                ),
                "push": tfun(
                    tcon_ex("Array", [
                        tvar([])
                    ]),
                    tcon("bool"),
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
        dependencies: ASTNode[]
    }
    | {
        tag: "TCon";
        tcon: {
            name: string;
            types: Types[];
        };
        dependencies: ASTNode[]
    }
    | {
        tag: "TRec";
        trec: {
            name: string;
            types: Record<string, Types>;
        },
        dependencies: ASTNode[],
        methods: Map<string, any>,
    }
    | {
        tag: "TSum";
        tsum: {
            name: string;
            variants: Record<string, Types>;
        },
        dependencies: ASTNode[],
        methods: Map<string, any>
    }


export function tcon(type: string, dependencies: ASTNode[] = []): Types {
    return {
        tag: "TCon",
        tcon: {
            name: type,
            types: []
        },
        dependencies
    };
}

export function tfun(params: Types, ret: Types, dependencies: ASTNode[] = []): Types {
    if (params.tag == "TCon" && params.tcon.name == "Array") {
        let p = params.tcon.types;

        return {
            tag: "TCon",
            tcon: {
                name: "->",
                types: [...p, ret]
            },
            dependencies
        }
    }

    throw new Error("Bad tfun arguments");
}

export function tcon_ex(name: string, types: Types[], dependencies: ASTNode[] = []): Types {
    return {
        tag: "TCon",
        tcon: {
            name: name,
            types: types
        },
        dependencies
    }
}

let counter = 0;

export function tvar(
    dependencies: ASTNode[],
    name?: string,
): Types {
    return {
        tag: "TVar",
        tvar: name ?? `T${counter++}`,
        dependencies
    };
}