import {
    add_builtins,
    Extension,
    ExtensionStore,
    id
} from "@kithinji/tlugha-core";

import {
    ASTVisitor,
    Module,
    Cache
} from "@kithinji/tlugha-core";

import {
    builtin,
    lugha
} from "./types"

import * as path from 'path';
import { writeFile, unlink } from "fs/promises";

class UploadBuiltins extends Extension<ASTVisitor> {
    public name = "UploadBuiltins";

    constructor(
        public std: string
    ) {
        super();
    }

    async before_accept() { }

    async after_accept() { }

    async handle_node() { }

    async after_main() { }

    before_run() {
        return [
            async ({ root }: { root: Module }) => {
                add_builtins(builtin, { root });
            },
            async ({ current }: { current: Module }) => {
                let module;

                let cache = Cache.get_instance();
                const wd = path.join(this.std, "../std");
                const mod_path = path.join(wd, "__mod__.la")

                if (cache.has_mod(mod_path)) {
                    module = cache.get_mod(mod_path);
                } else {
                    module = new Module("std");
                }


                current.add_submodule(module);

                if (!cache.has_mod(mod_path)) {
                    cache.add_mod(mod_path, module);

                    try {
                        ExtensionStore.get_instance().unregister("UploadBuiltins")

                        await lugha({
                            module,
                            rd: this.std,
                            file: "__mod__.la",
                            wd,
                        })

                        ExtensionStore.get_instance().register(new UploadBuiltins(this.std))

                    } catch (error) {
                        throw error;
                    }
                }
            }
        ]
    }
}

export async function exec({
    filepath,
    code,
    config
}: {
    code?: string,
    filepath?: string,
    config?: Record<string, any>
}) {
    let module: Module = new Module("root");

    let temp_filepath = null;
    if (code) {
        temp_filepath = id();
        filepath = `${temp_filepath}.la`;
        await writeFile(filepath, code);
    }

    if (!filepath) throw new Error("Filepath is empty");

    const a = path.parse(filepath);

    ExtensionStore.get_instance().register(new UploadBuiltins(__dirname))

    try {
        const engine = await lugha({
            module,
            wd: a.dir,
            rd: a.dir,
            file: a.base
        })

        if (config &&
            "call_main" in config &&
            config.call_main
        ) {
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
    }
}