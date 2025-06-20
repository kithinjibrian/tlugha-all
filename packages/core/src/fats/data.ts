import { id, Serializer } from "../types";

export class FatData {
    public data: any;
    public __id: string = id(26);

    constructor(data: any) {
        this.data = data;
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "fat_data",
            value: {
                data: serializer.to_json(this.data)
            }
        };
    }

    static from_json(value: any) {
        return new FatData(value.data);
    }
}