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
    const filepath = `${wd}/${file}`
    const code = fs.readFile(filepath);

    try {
        let lexer = new Lexer(code, filepath);
        let tokens = lexer.tokenize();

        let parser = new Parser(tokens, filepath);
        let ast = parser.parse();

        const engine = new EngineBrowser(
            filepath,
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