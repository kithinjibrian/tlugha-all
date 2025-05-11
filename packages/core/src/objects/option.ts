import { create_node, Engine, NumberNode, TaggedNode, TupleVariantNode } from "../types"

export let option = (engine: Engine, some: any, none: number) => {
    if (some !== undefined && some !== null) {
        let res = null
        engine.root.children.map(mod => {
            if (mod.name == "Option") {
                const tn = mod.frame.get("Some") as TaggedNode;
                res = new TaggedNode(
                    null,
                    "Some",
                    new TupleVariantNode(
                        null,
                        [
                            create_node(some)
                        ]
                    ),
                    tn.members
                )
            }
        })

        if (res)
            return res;
        else
            throw new Error("Can't find Option enum");

    }

    let res = null
    engine.root.children.map(mod => {
        if (mod.name == "Option") {
            const tn = mod.frame.get("None") as TaggedNode;
            res = new TaggedNode(
                null,
                "None",
                new TupleVariantNode(
                    null,
                    [
                        new NumberNode(null, none)
                    ]
                ),
                tn.members
            )
        }
    })

    if (res)
        return res;
    else
        throw new Error("Can't find Option enum");
}