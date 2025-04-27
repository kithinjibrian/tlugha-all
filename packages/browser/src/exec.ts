import {
    builtin,
    Extension,
    ExtensionStore,
    Cache,
    add_builtins,
    id
} from "@kithinji/tlugha-core";

import {
    ASTVisitor,
    Module,
} from "@kithinji/tlugha-core";

import {
    lugha
} from "./types"
import { FS } from "./fs/fs";
import { write_std } from "./std/std";
import { parse } from "./path/path"

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
            async ({ root, }: { root: Module }) => {
                add_builtins(builtin, { root });
            },
            async ({ current }: { current: Module }) => {
                if (!this.std) return;

                let module;

                let cache = Cache.get_instance();
                const wd = `${this.std}/std`;
                const mod_path = `${wd}/__mod__.la`;

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
                            wd
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
    const fs = FS.getInstance();
    fs.mkdir("/", "std");

    write_std();

    let temp_filepath = null;
    if (code) {
        temp_filepath = id();
        filepath = `${temp_filepath}.la`;
        fs.writeFile(filepath, code);
    }

    if (!filepath) throw new Error("Filepath is empty");

    const a = parse(filepath);

    ExtensionStore.get_instance().register(new UploadBuiltins("/"))

    try {
        const engine = await lugha({
            rd: a.dir,
            wd: a.dir,
            module,
            file: a.base
        })

        return await engine.call_main();

    } catch (error) {
        throw error;
    }
}