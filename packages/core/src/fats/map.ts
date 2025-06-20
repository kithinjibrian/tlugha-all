import { id, Serializer } from "../types";

export class FatMap<K, V> {
    public data: Map<K, V>;
    public __id: string = id(26);

    constructor(
        array: [K, V][] = []
    ) {
        this.data = new Map(array);
    }

    set(key: K, value: V) {
        this.data.set(key, value);
    }

    get(key: K) {
        return this.data.get(key);
    }

    has(key: K) {
        return this.data.has(key);
    }

    entries() {
        return this.data.entries();
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "fat_map",
            value: {
                data: Array.from(this.data).map(([k, v]) => [serializer.to_json(k), serializer.to_json(v)])
            }
        };
    }

    static from_json(value: any) {
        return new FatMap(value.data);
    }

    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }
}