export class Serializer {
    constructor(
        public cache = new Map(),
    ) { }

    to_json(obj: any): any {
        if (obj == undefined) {
            return undefined;
        }

        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (!obj.__id) {
            if (Array.isArray(obj)) {
                return obj.map(item => this.to_json(item));
            } else {
                const result: Record<string, any> = {};
                for (let key in obj) {
                    result[key] = this.to_json(obj[key]);
                }
                return result;
            }
        }

        if (this.cache.has(obj.__id)) {
            //   console.log("Already cached", obj.__id);

            return {
                format: "lugha",
                __id: obj.__id,
            };
        }

        this.cache.set(obj.__id, {});

        const result = obj.toJSON(this);

        this.cache.set(obj.__id, result);

        return result;
    }
}

export const to_string = (
    obj: any,
    replacer: (number | string)[] | null = null,
    space: string | number = 2
) => {
    const serializer = new Serializer();
    const json = serializer.to_json(obj);
    const seen = new Map();
    let id_counter = 1;

    function helper(
        value: any,
    ) {
        if (typeof value !== 'object' || value === null) {
            return value;
        }

        let id;
        if (
            "format" in value &&
            value.format === "lugha"
        ) {
            if (seen.has(value.__id)) {
                return {
                    __ref: value.__id
                }
            }

            id = value.__id;
            seen.set(id, id);
        } else {
            if (seen.has(value)) {
                return {
                    __ref: seen.get(value)
                }
            }

            id = `id${id_counter++}`;
            seen.set(value, id);
        }

        const result: any = Array.isArray(value) ? [] : { __id: id };

        for (const key in value) {
            if (Object.hasOwn(value, key)) {
                result[key] = helper(value[key]);
            }
        }

        return result;
    }


    return JSON.stringify(helper(json), replacer, space);
}