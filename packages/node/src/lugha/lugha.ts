import {
    Lexer,
    Module,
    Parser
} from "@kithinji/tlugha-core";

import {
    Engine
} from "../types"

import * as path from 'path';
import { readFileSync } from "fs"

export async function lugha({
    rd,
    wd,
    file,
    module
}: {
    wd: string,
    rd: string,
    file: string,
    module: Module
}): Promise<Engine> {
    const file_path = path.join(wd, file);
    const code = readFileSync(file_path, 'utf-8')

    try {
        let lexer = new Lexer(code);
        let tokens = lexer.tokenize();

        let parser = new Parser(tokens);
        let ast = parser.parse();

        const engine = new Engine(
            rd,
            wd,
            ast,
            module,
            lugha
        );

        return engine.run();
    } catch (error: any) {
        throw error;
    }
}   