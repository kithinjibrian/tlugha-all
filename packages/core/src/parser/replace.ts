import { ASTNode } from "./ast";

export function replace_node(
    target: ASTNode,
    replacement: ASTNode | ASTNode[]
): void {
    const parent = target.parent;

    if (!parent) {
        throw new Error("Cannot replace node without a parent.");
    }

    const newNodes = Array.isArray(replacement) ? replacement : [replacement];

    for (const node of newNodes) {
        node.parent = parent;
    }

    if (
        "body" in parent &&
        Array.isArray((parent as any).body)
    ) {
        const list = (parent as any).body as ASTNode[];
        const index = list.indexOf(target);
        if (index !== -1) {
            list.splice(index, 1, ...newNodes);
            return;
        }
    }

    if (
        "sources" in parent &&
        Array.isArray((parent as any).sources)
    ) {
        const list = (parent as any).sources as ASTNode[];
        const index = list.indexOf(target);
        if (index !== -1) {
            list.splice(index, 1, ...newNodes);
            return;
        }
    }
}