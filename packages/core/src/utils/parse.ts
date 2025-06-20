import { Lexer, Parser } from "../types";

export const parse = (code: string) => {
    let lexer = new Lexer(code, "array_iter");
    return new Parser(lexer.tokenize(), "array_iter");
}