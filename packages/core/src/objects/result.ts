import {
    create_node,
    Engine,
    TaggedNode,
    TupleVariantNode
} from "../types"

export let result = (engine: Engine, ok: any, err: any) => {
    if (ok !== undefined && ok !== null) {
        let res = null
        engine.root.children.map(mod => {
            if (mod.name == "Result") {
                const tn = mod.frame.get("Ok") as TaggedNode;
                res = new TaggedNode(
                    null,
                    "Ok",
                    new TupleVariantNode(
                        null,
                        [
                            create_node(ok)
                        ]
                    ),
                    tn.members
                )
            }
        })

        if (res)
            return res;
        else
            throw new Error("Can't find Result enum");

    }

    let res = null
    engine.root.children.map(mod => {
        if (mod.name == "Result") {
            const tn = mod.frame.get("Err") as TaggedNode;
            res = new TaggedNode(
                null,
                "Err",
                new TupleVariantNode(
                    null,
                    [
                        create_node(err)
                    ]
                ),
                tn.members
            )
        }
    })

    if (res)
        return res;
    else
        throw new Error("Can't find Result enum");
}