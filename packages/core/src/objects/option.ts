import { create_node, Module, NumberNode, TaggedNode, TupleVariantNode } from "../types"

export let option = (engine: any, some: any, none: number) => {
    if (some !== undefined && some !== null) {
        let res = null
        engine.root.children.map((mod: Module) => {
            if (mod.name == "Option") {
                const tn = mod.env.get("Some") as TaggedNode;
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
    engine.root.children.map((mod: Module) => {
        if (mod.name == "Option") {
            const tn = mod.env.get("None") as TaggedNode;
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