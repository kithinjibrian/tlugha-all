import { Type } from "./base";

export class DateType extends Type<Date> {
    constructor(value: Date) {
        super("date", value, {
        });
    }
}