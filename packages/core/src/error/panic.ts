export class Panic extends Error {
    constructor(message: string) {
        super(message)
    }
}