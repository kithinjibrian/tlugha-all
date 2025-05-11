import { Env, Type } from "./base";
import { NumberType } from "./number";

export class RangeType extends Type<Type<number>[]> {
    constructor(
        public start: Type<number>,
        public end: Type<number>,
        public is_inclusive: boolean
    ) {
        super("range", [], {
            str: async (env: Env) => `[${start.getValue()}..${end.getValue()}]`,
            getValue: () => {
                return []
            }
        });
    }

    *[Symbol.iterator]() {
        const start_value = this.start.getValue();
        const end_value = this.end.getValue();

        if (this.is_inclusive) {
            for (let i = start_value; i <= end_value; i++) {
                yield new NumberType(i);
            }
        } else {
            for (let i = start_value; i < end_value; i++) {
                yield new NumberType(i);
            }
        }
    }
}