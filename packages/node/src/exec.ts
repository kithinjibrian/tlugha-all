import {
    ASTNode,
    id
} from "@kithinji/tlugha-core";

import {
    Cache
} from "@kithinji/tlugha-core";

import {
    builtin,
    lugha,
    pipe_borrowcheck,
    pipe_engine,
    pipe_expandmacro,
    pipe_lp,
    pipe_procmacro,
    pipe_read,
    pipe_typecheck
} from "./types"

import * as path from 'path';
import { writeFile, unlink } from "fs/promises";

export async function exec({
    filepath,
    code,
    ast,
    config
}: {
    ast?: ASTNode,
    code?: string,
    filepath?: string,
    config?: Record<string, any>
}) {
    let temp_filepath = null;
    if (code) {
        temp_filepath = id();
        filepath = `${temp_filepath}.la`;
        await writeFile(filepath, code);
    }

    if (!filepath) {
        if (!ast) throw new Error("Filepath is empty");
        filepath = ""
    }

    const a = path.parse(filepath);

    try {
        const engine = await lugha({
            pipeline: [
                pipe_read,
                pipe_lp,
                pipe_procmacro,
                pipe_expandmacro,
                //  pipe_borrowcheck,
                // pipe_typecheck,
                pipe_engine
            ],
            wd: a.dir,
            rd: a.dir,
            file: a.base,
            ast
        })

        if (config &&
            "call_main" in config &&
            config.call_main
        ) {
            if (engine)
                return await engine.call_main();
        }
        else
            return null;

    } catch (error) {
        throw error;
    } finally {
        if (temp_filepath)
            await unlink(filepath);

        Cache.get_instance().clear_cache()
        Cache.get_instance("macro").clear_cache()
    }
}
