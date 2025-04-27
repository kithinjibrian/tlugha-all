import {
    builtin,
    Extension,
    ExtensionStore,
    Cache,
    add_builtins
} from "@kithinji/tlugha-core";

import {
    ASTVisitor,
    Module,
} from "@kithinji/tlugha-core";

import {
    lugha
} from "./types"

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
    code,
    std
}: {
    code: string,
    std: string
}) {
    let module: Module = new Module("root");

    ExtensionStore.get_instance().register(new UploadBuiltins(std))

    try {
        const engine = await lugha({
            rd: "",
            wd: "",
            module,
            code
        })

        return await engine.call_main();

    } catch (error) {
        throw error;
    }
}