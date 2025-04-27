import {
    Lexer,
    Module,
    Parser
} from "@kithinji/tlugha-core";

import { EngineBrowser } from "../types";
import { FS } from "../fs/fs";

export async function lugha({
    rd,
    wd,
    file,
    module,
}: {
    rd: string,
    wd: string,
    file: string,
    module: Module
}): Promise<EngineBrowser> {
    const fs = FS.getInstance();
    const code = fs.readFile(`${wd}/${file}`);

    try {
        let lexer = new Lexer(code);
        let tokens = lexer.tokenize();

        let parser = new Parser(tokens);
        let ast = parser.parse();

        const engine = new EngineBrowser(
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