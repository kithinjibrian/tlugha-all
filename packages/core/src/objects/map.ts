import { Type } from "./base";
import { BoolType } from "./bool";

export class MapType extends Type<Record<string, Type<any>>> {
    constructor(value: Record<string, Type<any>>) {
        super("map", value, {
            getValue: () => {
                return Object.entries(value).reduce((acc, [key, val]) => {
                    acc[key] = val.getValue();
                    return acc;
                }, {} as Record<string, any>);
            },
            str: (indentLevel = 0) => {
                let result = "{\n";

                const indent = "  ".repeat(indentLevel + 1);

                Object.entries(value).forEach(([key, val], index, array) => {
                    result += `${indent}${key}: `;

                    if (val && typeof val === "object" && val.str) {
                        result += val.str(indentLevel + 1);
                    } else {
                        result += val.str ? val.str() : String(val.getValue());
                    }

                    if (index < array.length - 1) {
                        result += ",\n";
                    }
                });

                result += "\n" + "  ".repeat(indentLevel) + "}";

                return result;
            },
            get: (obj: Type<string>) => {
                const index = obj.getValue();

                if (value[index])
                    return value[index];
                else
                    return new BoolType(false);
            },
            set: (key: Type<string>, newValue: Type<any>) => {
                const index = key.getValue();
                value[index] = newValue;
            }
        });
    }
}