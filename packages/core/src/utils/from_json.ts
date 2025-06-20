import { FatData } from "../fats/data";
import { FatMap } from "../fats/map";
import {
    ASTNodeBase,
    EEnv,
    Module,
    Type,
    XM_Frame,
    XMachina,
    XState
} from "../types";

const handlers: Record<string, (value: any) => any> = {
    objects: (value) => Type.from_json(value.type, value.value),
    ast: (value) => ASTNodeBase.from_json(value),
    env: (value) => EEnv.from_json(value),
    xstate: (value) => XState.from_json(value),
    fat_data: (value) => FatData.from_json(value),
    module: (value) => Module.from_json(value),
    xm_frame: (value) => XM_Frame.from_json(value),
    XMachina: (value) => XMachina.from_json(value),
    fat_map: (value) => FatMap.from_json(value.data),
};

interface FromJsonOptions {
    skipParsing?: boolean;
    strict?: boolean;
    skipFields?: Set<string>;
}

/**
 * Deserialize a snapshot JSON string or object
 * Rebuilds circular references and typed structures
 */
export function from_json(
    json: string | any,
    options: FromJsonOptions = {}
): any {
    const {
        skipParsing = false,
        strict = true,
        skipFields = new Set([])
    } = options;

    const raw = skipParsing ? json : JSON.parse(json);
    const id_map = new Map();

    function build_skeleton(node: any): any {
        if (typeof node !== "object" || node === null) return node;
        if ("__ref" in node) return node;

        if (
            node.format === "lugha" &&
            "type" in node &&
            "value" in node
        ) {
            const handler = handlers[node.type];
            if (!handler) {
                if (strict) throw new Error(`Unknown lugha type: ${node.type}`);
                return node.value; // fallback
            }

            const processedValue = build_skeleton(node.value);
            const rebuilt = handler(processedValue);

            if ("__id" in node) {
                id_map.set(node.__id, rebuilt);
            } else {
                throw new Error(
                    `Missing __id in lugha object: ${JSON.stringify(node)}`
                )
            }

            return rebuilt;
        }

        const clone: any = Array.isArray(node) ? [] : {};
        if ("__id" in node) id_map.set(node.__id, clone);

        for (const key in node) {
            if (Object.hasOwn(node, key) && !skipFields.has(key)) {
                clone[key] = build_skeleton(node[key]);
            }
        }

        return clone;
    }

    function resolve_refs(node: any): void {
        if (typeof node !== "object" || node === null) return;

        if (node instanceof Map) {
            const entries = Array.from(node.entries());
            node.clear();
            for (const [key, value] of entries) {
                const resolvedKey = resolve_ref_value(key);
                const resolvedValue = resolve_ref_value(value);
                node.set(resolvedKey, resolvedValue);
            }
            return;
        }

        if (node instanceof Set) {
            const values = Array.from(node.values());
            node.clear();
            for (const value of values) {
                node.add(resolve_ref_value(value));
            }
            return;
        }

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                node[i] = resolve_ref_value(node[i]);
            }
            return;
        }

        for (const key in node) {
            if (!skipFields.has(key)) {
                node[key] = resolve_ref_value(node[key]);
            }
        }
    }

    function resolve_ref_value(value: any): any {
        if (typeof value === "object" && value !== null) {
            if ("__ref" in value) {
                const resolved = id_map.get(value.__ref);
                if (resolved === undefined && strict) {
                    throw new Error(`Missing reference: __id=${value.__ref}`);
                }
                return resolved ?? null;
            }
            resolve_refs(value);
        }
        return value;
    }

    const skeleton = build_skeleton(raw);
    resolve_refs(skeleton);
    return skeleton;
}
