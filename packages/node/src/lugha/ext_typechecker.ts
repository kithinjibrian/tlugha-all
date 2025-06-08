import {
    ASTVisitor,
    builtin,
    Extension,
    Module,
    Cache,
    Lexer,
    Parser,
    Args
} from "@kithinji/tlugha-core";
import { lugha, pipe_args, pipe_lp, pipe_read } from "./lugha";

import * as path from 'path';
import { TypeCheckerNode } from "../typechecker/typechecker";

export class ExtTypeChecker extends Extension<ASTVisitor> {
    public name = "ExtTypeChecker";

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

                let module;

                let cache = Cache.get_instance("typechecker");

                if (cache.has_mod("builtin")) {
                    module = cache.get_mod("builtin") as Module;
                } else {
                    module = new Module("builtin");
                }

                root.add_submodule(module);

                if (!cache.has_mod("builtin")) {
                    cache.add_mod("builtin", module);

                    for (let [key, value] of Object.entries(builtin)) {
                        const lexer = new Lexer(value.signature, "builtin");
                        const tokens = lexer.tokenize();

                        const parser = new Parser(tokens, "");
                        const ast = parser.type({} as Args);

                        const tc = new TypeCheckerNode(
                            "builtin",
                            "builtin",
                            "builtin",
                            module,
                            lugha,
                            ast
                        );

                        const type = await tc.visit(ast, {
                            frame: module.frame,
                            module
                        });


                        if (type?.type == "type") {
                            let t;

                            if (value.type == "function") {
                                t = {
                                    type: "scheme",
                                    value: tc.hm.generalize(type.value, module.frame)
                                };
                            } else {
                                t = type
                            }

                            module.frame.define(key, t);
                        }
                    }
                }
            },
            async ({ root, file }: { root: Module, file: string }) => {

                let module;

                let cache = Cache.get_instance("typechecker");
                const wd = path.join(this.dir, "../core");
                const mod_path = path.join(wd, "__mod__.la")

                if (cache.has_mod(mod_path)) {
                    module = cache.get_mod(mod_path) as Module;
                    module.children.map((mod: Module) => root.children.push(mod))

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
                    module = new Module("core", null, `typechecker_core-${file}`);
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
                                        const tc = new TypeCheckerNode(
                                            args.file_path ?? "",
                                            args.rd,
                                            args.wd,
                                            module,
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

                        module.children.map((mod: Module) => root.children.push(mod))

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
            async ({ root, file }: { root: Module, file: string }) => {
                let module;

                let cache = Cache.get_instance("typechecker");
                const wd = path.join(this.dir, "../std");
                const mod_path = path.join(wd, "__mod__.la")

                if (cache.has_mod(mod_path)) {
                    module = cache.get_mod(mod_path) as Module;
                } else {
                    module = new Module("std", null, `typechecker_std-${file}`);
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
                                        const tc = new TypeCheckerNode(
                                            args.file_path ?? "",
                                            args.rd,
                                            args.wd,
                                            module,
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
                }
            },
        ]
    }
}