import {
    Lexer,
    Module,
    Parser
} from "@kithinji/tlugha-core";

import { EngineBrowser } from "../types";

export async function lugha({
    rd,
    wd,
    code,
    file,
    module,
}: {
    rd: string,
    wd: string,
    file?: string,
    code?: string,
    module: Module
}): Promise<EngineBrowser> {
    if (!code) {
        if (file && wd) {
            const mod_path = `${wd}/${file}`;
            const response = await fetch(mod_path);
            code = await response.text();
        } else {
            throw new Error("Empty code")
        }
    }

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