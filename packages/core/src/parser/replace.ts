import { ASTNode } from "./ast";

export function _replace_node(
    target: ASTNode,
    replacement: ASTNode | ASTNode[]
): void {
    const parent = target.parent;
    if (!parent) {
        throw new Error("Cannot replace node without a parent.");
    }

    const newNodes = Array.isArray(replacement) ? replacement : [replacement];

    // Update parent references for all new nodes
    for (const node of newNodes) {
        node.parent = parent;
    }

    // Try to replace in array fields
    const tryReplaceInList = (field: string): boolean => {
        if (field in parent && Array.isArray((parent as any)[field])) {
            const list = (parent as any)[field] as ASTNode[];
            const index = list.indexOf(target);
            if (index !== -1) {
                list.splice(index, 1, ...newNodes);
                return true;
            }
        }
        return false;
    };

    // Try to replace in single-value fields
    const tryReplaceField = (field: string): boolean => {
        if ((parent as any)[field] === target) {
            if (newNodes.length > 1) {
                throw new Error(
                    `Cannot replace single field '${field}' with multiple nodes. ` +
                    `Consider wrapping in a container node or restructuring the AST.`
                );
            }
            (parent as any)[field] = newNodes[0];
            return true;
        }
        return false;
    };

    // Common AST field names - extend as needed
    const arrayFields = ["body", "sources", "args", "elements", "statements", "declarations", "parameters"];
    const singleFields = ["expression", "left", "right", "condition", "consequent", "alternate", "init", "test", "update"];

    // Try array fields first
    for (const field of arrayFields) {
        if (tryReplaceInList(field)) {
            return;
        }
    }

    // Then try single fields
    for (const field of singleFields) {
        if (tryReplaceField(field)) {
            return;
        }
    }

    throw new Error(
        `Failed to replace node: target not found in any known field of parent. ` +
        `Parent type: ${parent.constructor.name}`
    );
}

// Alternative: Dynamic field discovery version
export function replace_node_dynamic(
    target: ASTNode,
    replacement: ASTNode | ASTNode[]
): void {
    const parent = target.parent;
    if (!parent) {
        throw new Error("Cannot replace node without a parent.");
    }

    const newNodes = Array.isArray(replacement) ? replacement : [replacement];

    // Update parent references
    for (const node of newNodes) {
        node.parent = parent;
    }

    // Dynamically find the field containing the target
    for (const [key, value] of Object.entries(parent)) {
        if (Array.isArray(value)) {
            const index = value.indexOf(target);
            if (index !== -1) {
                value.splice(index, 1, ...newNodes);
                return;
            }
        } else if (value === target) {
            if (newNodes.length > 1) {
                throw new Error(
                    `Cannot replace single field '${key}' with multiple nodes.`
                );
            }
            (parent as any)[key] = newNodes[0];
            return;
        }
    }

    throw new Error("Failed to replace node: target not found in parent.");
}

// Utility function to safely replace with validation
export function replace_node(
    target: ASTNode,
    replacement: ASTNode | ASTNode[],
    options: {
        allowMultipleInSingleField?: boolean;
        validateParentChild?: boolean;
    } = {}
): void {
    const { allowMultipleInSingleField = false, validateParentChild = true } = options;

    if (validateParentChild && target.parent) {
        // Verify the target is actually a child of its claimed parent
        let found = false;
        for (const [key, value] of Object.entries(target.parent)) {
            if (Array.isArray(value) && value.includes(target)) {
                found = true;
                break;
            } else if (value === target) {
                found = true;
                break;
            }
        }
        if (!found) {
            throw new Error("Target node's parent reference is inconsistent.");
        }
    }

    if (!allowMultipleInSingleField) {
        replace_node_dynamic(target, replacement);
    } else {
        // Custom logic for handling multiple nodes in single fields
        // This would depend on your specific AST design
        replace_node_dynamic(target, replacement);
    }
}