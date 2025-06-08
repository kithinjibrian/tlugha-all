import {
    add_builtins,
    ASTVisitor,
    builtin,
    Extension,
    Module,
    Cache
} from "@kithinji/tlugha-core";

import { lugha, pipe_args, pipe_lp, pipe_procmacro, pipe_read } from "./lugha";

import * as path from 'path';
import { ExpandMacroNode } from "../macro/expand";

export class ExtExpMacro extends Extension<ASTVisitor> {
    public name = "ExtExpMacro";

    constructor(
        public dir: string
    ) {
        super();
    }

    async before_accept() { }

    async after_accept() { }

    async handle_node() { }

    async after_main() { }

    before_run() {
        return [
            async ({ root }: { root?: Module }) => {
                if (root == undefined) throw new Error("Module root undefined");
                add_builtins(builtin, { root: root });
            },
            async ({ root }: { root: Module }) => {
                let module;

                let cache = Cache.get_instance("expand_macro");

                const wd = path.join(this.dir, "../core");
                const mod_path = path.join(wd, "__mod__.la")

                if (cache.has_mod(mod_path)) {
                    module = cache.get_mod(mod_path);
                    module.children.map(mod => root.children.push(mod))

                    root.children.map((mod: Module) => {
                        if (mod.name == "Result") {
                            mod.frame.symbol_table.entries().forEach(([key, value]) => {
                                root.frame.define(key, value)
                            })
                        } else if (mod.name == "Option") {
                            mod.frame.symbol_table.entries().forEach(([key, value]) => {
                                root.frame.define(key, value)
                            })
                        }
                    })
                } else {
                    module = new Module("core", null, "expand_core", true);
                }

                root.add_submodule(module);

                if (!cache.has_mod(mod_path)) {
                    cache.add_mod(mod_path, module);

                    try {
                        await lugha({
                            pipeline: [
                                pipe_read,
                                pipe_lp,
                                async (args: pipe_args, next: Function) => {
                                    try {
                                        let em = new ExpandMacroNode(
                                            args.file_path ?? "",
                                            args.rd,
                                            args.wd,
                                            module,
                                            lugha,
                                            args.ast,
                                        );

                                        await em.run(true);

                                    } catch (e) {
                                        throw e;
                                    }
                                }
                            ],
                            rd: this.dir,
                            file: "__mod__.la",
                            wd,
                        })

                        module.children.map(mod => root.children.push(mod))

                        root.children.map((mod: Module) => {
                            if (mod.name == "Result") {
                                mod.frame.symbol_table.entries().forEach(([key, value]) => {
                                    root.frame.define(key, value)
                                })
                            } else if (mod.name == "Option") {
                                mod.frame.symbol_table.entries().forEach(([key, value]) => {
                                    root.frame.define(key, value)
                                })
                            }
                        })
                    } catch (error) {
                        throw error;
                    }
                }
            },
            async ({ root }: { root: Module }) => {
                let module;

                let cache = Cache.get_instance("expand_macro");
                const wd = path.join(this.dir, "../std");
                const mod_path = path.join(wd, "__mod__.la")

                if (cache.has_mod(mod_path)) {
                    module = cache.get_mod(mod_path);
                } else {
                    module = new Module("std", null, "expand_macro_std", true);
                }

                root.add_submodule(module);

                if (!cache.has_mod(mod_path)) {
                    cache.add_mod(mod_path, module);

                    try {

                        await lugha({
                            pipeline: [
                                pipe_read,
                                pipe_lp,
                                async (args: pipe_args, next: Function) => {
                                    try {
                                        let pm = new ExpandMacroNode(
                                            args.file_path ?? "",
                                            args.rd,
                                            args.wd,
                                            module,
                                            lugha,
                                            args.ast
                                        );

                                        await pm.run(true)
                                    } catch (e) {
                                        throw e;
                                    }
                                }
                            ],
                            rd: this.dir,
                            file: "__mod__.la",
                            wd,
                        })

                    } catch (error) {
                        throw error;
                    }
                }
            },
            async ({ root, file }: { root: Module, file: string }) => {
                if (root.is_prologue) return;

                const wd = path.join(this.dir, "../epilogue");

                try {
                    await lugha({
                        pipeline: [
                            pipe_read,
                            pipe_lp,
                            async (args: pipe_args, next: Function) => {
                                try {
                                    const tc = new ExpandMacroNode(
                                        args.file_path ?? "",
                                        args.rd,
                                        args.wd,
                                        root,
                                        lugha,
                                        args.ast,
                                    );

                                    await tc.run(true)
                                } catch (e) {
                                    throw e;
                                }
                            }
                        ],
                        rd: this.dir,
                        file: "__mod__.la",
                        wd,
                    })

                } catch (error) {
                    throw error;
                }
            },
        ]
    }
}