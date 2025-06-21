import {
    Lexer,
    Parser,
    Module,
    ASTNode,
    ASTCache,
    add_builtins,
    Cache,
    TCE,
    TC_GEN,
    TC_SCHEME
} from "@kithinji/tlugha-core";

import * as path from 'path';
import { readFile } from "fs/promises";
import { DesugarNode } from "../desugar/desugar";
import { XMachinaNode } from "../xmachina/xmachina";
import { DesugarTCNode } from "../desugar_tc/desugar_tc";
import { TCNode } from "../tc/tc";
import { builtin } from "../builtin";
import { CodeGenNode } from "../code/code";

export type pipe_args = {
    wd: string;
    rd: string;
    file: string;
    ast?: ASTNode;
    code?: string;
    phase?: string;
    file_path?: string,
    engine?: any,
    root_child?: "root" | "child",
    pm_module?: Module,
    xm_module?: Module,
    tc_module?: Module,
    dtc_module?: Module,
    ds_module?: Module,
    cg_module?: Module,
}

export type lugha_fn = (args: {
    wd: string;
    rd: string;
    file: string;
    ast?: ASTNode;
    phase?: string;
    root_child?: "root" | "child";
    rt_module?: Module;
    pm_module?: Module;
    em_module?: Module;
    xm_module?: Module; // xmachina module
    tc_module?: Module;
    dtc_module?: Module;
    ds_module?: Module;
    pipeline: ((args: pipe_args, next: Function) => void)[]
}) => Promise<XMachinaNode | undefined>;

const pipe_builtin = () => {
    return async (tc: any, next: Function) => {
        console.log("adding inbuilt functions");

        add_builtins(builtin, { root: tc.root });

        await next();
    }
}

const pipe_core = (cache_name: string, mod_name: string, pipe_to: (args: pipe_args, next: Function) => void) => {
    return async (tc: any, next: Function) => {
        let module;

        const dir = path.join(__dirname, "..");
        const wd = path.join(dir, "../core");

        // don't re import once in core modules
        if (tc.wd == wd) return await next();

        let cache = Cache.get_instance(cache_name);
        const mod_path = path.join(wd, "__mod__.la");

        if (cache.has_mod(mod_path)) {
            module = cache.get_mod(mod_path) as Module;

            module.children.map((mod: Module) => {
                const m = tc.root.children.find((ch: Module) => ch.name == mod.name)
                if (m == undefined) {
                    tc.root.children.push(mod)
                }
            });

            tc.root.children.map((mod: Module) => {
                if (mod.name == "Result") {
                    mod.env.symbol_table.entries().forEach(([key, value]) => {
                        tc.root.env.define(key, value)
                    })
                } else if (mod.name == "Option") {
                    mod.env.symbol_table.entries().forEach(([key, value]) => {
                        tc.root.env.define(key, value)
                    })
                }
            });
        } else {
            module = new Module("core", null, `${cache_name}-${tc.file}`, true);
        }

        tc.root.add_submodule(module);

        if (!cache.has_mod(mod_path)) {
            cache.add_mod(mod_path, module);

            try {
                await lugha({
                    pipeline: [
                        pipe_read,
                        pipe_lp,
                        pipe_to,
                    ],
                    file: "__mod__.la",
                    wd,
                    rd: dir,
                    [mod_name]: module,
                    root_child: "root"
                });

                module.children.map((mod: Module) => {
                    const m = tc.root.children.find((ch: Module) => ch.name == mod.name)
                    if (m == undefined) {
                        tc.root.children.push(mod)
                    }
                });

                tc.root.children.map((mod: Module) => {
                    if (mod.name == "Result") {
                        mod.env.symbol_table.entries().forEach(([key, value]) => {
                            tc.root.env.define(key, value)
                        })
                    } else if (mod.name == "Option") {
                        mod.env.symbol_table.entries().forEach(([key, value]) => {
                            tc.root.env.define(key, value)
                        })
                    }
                });
            } catch (e) {
                throw e;
            }
        }

        await next();
    }
}

const pipe_std = (cache_name: string, mod_name: string, pipe_to: (args: pipe_args, next: Function) => void) => {
    return async (tc: any, next: Function) => {
        let module;

        const dir = path.join(__dirname, "..");
        const wd = path.join(dir, "../std");
        const core_wd = path.join(dir, "../core");

        // don't re import once in std/core modules
        if (tc.wd == core_wd) return await next();
        if (tc.wd == wd) return await next();

        let cache = Cache.get_instance(cache_name);
        const mod_path = path.join(wd, "__mod__.la");

        if (cache.has_mod(mod_path)) {
            module = cache.get_mod(mod_path) as Module;
        } else {
            module = new Module("std", null, `${cache_name}-${tc.file}`, true);
        }

        tc.root.add_submodule(module);

        if (!cache.has_mod(mod_path)) {
            cache.add_mod(mod_path, module);

            try {
                await lugha({
                    pipeline: [
                        pipe_read,
                        pipe_lp,
                        pipe_to,
                    ],
                    file: "__mod__.la",
                    wd,
                    rd: dir,
                    [mod_name]: module,
                    root_child: "root"
                });
            } catch (e) {
                throw e;
            }
        }

        await next();
    }
}

export const pipe_read = async (args: pipe_args, next: Function) => {
    // console.log("ENTERING PIPE READ!");
    try {
        args.file_path = path.join(args.wd, args.file);

        const c = ASTCache.get_instance();
        if (!c.has_ast(args.file_path)) {
            // skip reading code if we already have the ast
            if (!args.ast)
                args.code = await readFile(args.file_path, 'utf-8');
        }

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_lp = async (args: pipe_args, next: Function) => {
    if (args.ast) return await next(); // skip lexing/parsing
    //  console.log("ENTERING PIPE LEX/PARSE!");

    const c = ASTCache.get_instance();

    if (args.file_path) {
        if (c.has_ast(args.file_path)) {
            args.ast = c.get_ast(args.file_path);

            return await next();
        }
    }

    if (args.code && args.file_path) {
        try {

            let lexer = new Lexer(args.code, args.file_path);
            let tokens = lexer.tokenize();

            let parser = new Parser(tokens, args.file_path);
            args.ast = parser.parse();

            c.add_ast(args.file_path, args.ast);

            return await next();
        } catch (e) {
            throw e;
        }
    }
}

export const pipe_desugar = async (args: pipe_args, next: Function) => {
    //console.log("ENTERING PIPE DESUGAR!");

    try {
        const de = new DesugarNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.ds_module ?? new Module("root", null, "desugar_module"),
            args.ast
        );

        de.pipes = [
            pipe_core("desugar", "ds_module", pipe_desugar),
            pipe_std("desugar", "ds_module", pipe_desugar),
        ]

        await de.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

const tc_pipe_builtin = async (tc: any, next: Function) => {
    let module = new Module(
        "builtin",
        null,
        "builtin",
        true
    );

    tc.root.add_submodule(module);

    Object.entries(builtin)
        .map(([key, value]) => {
            if (value.type == "function") {
                let tp = `B${TC_GEN.global_counter.next().value}`;

                const fun_type = new TCE.FunctionType(
                    new TCE.BagType([
                        new TCE.TypeVariable(tp)
                    ]),
                    new TCE.TypeVariable(
                        tp
                    )
                );

                module.env.define(key, new TC_SCHEME.TypeScheme([tp], fun_type));
            }
        });

    await next();
}

export const pipe_tc = async (args: pipe_args, next: Function) => {
    try {
        const tc = new TCNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.tc_module ?? new Module("root", null, "tc_module"),
            args.ast,
        );

        tc.pipes = [
            //tc_pipe_builtin,
            pipe_core("tc", "tc_module", pipe_tc),
            // pipe_std("tc", "tc_module", pipe_tc),
        ]

        await tc.run();

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_desugartc = async (args: pipe_args, next: Function) => {
    // console.log("ENTERING PIPE DESUGAR_TC!");

    try {
        const de = new DesugarTCNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.dtc_module ?? new Module("root", null, "desugartc_module"),
            args.ast
        );

        de.pipes = [
            pipe_builtin(),
            pipe_core("desugar_tc", "dtc_module", pipe_desugartc),
            pipe_std("desugar_tc", "dtc_module", pipe_desugartc),
        ]

        await de.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_codegen = async (args: pipe_args, next: Function) => {
    // console.log("ENTERING PIPE CODEGEN!");

    try {
        const de = new CodeGenNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.cg_module ?? new Module("root", null, "codegen"),
            args.ast
        );

        de.pipes = []

        await de.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_xmachina = async (args: pipe_args, next: Function) => {
    //  console.log("ENTERING PIPE XMACHINA!");

    try {
        const xmachina = new XMachinaNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.xm_module ?? new Module("root", null, "engine_module"),
            args.ast,
            args.phase ?? "runtime"
        );

        xmachina.pipes.set(
            "runtime",
            [
                pipe_builtin(),
                pipe_core("xmachina", "xm_module", pipe_xmachina),
                pipe_std("xmachina", "xm_module", pipe_xmachina),
            ]
        )

        await xmachina.run()

        args.engine = xmachina;
    } catch (e) {
        throw e;
    }
}

export const lugha: lugha_fn = async ({
    rd,
    wd,
    file,
    ast,
    pipeline,
    xm_module,
    tc_module,
    dtc_module,
    ds_module,
    phase,
    root_child
}) => {
    let index = 0;
    const ctx: pipe_args = {
        rd,
        wd,
        file,
        ast,
        xm_module,
        phase,
        tc_module,
        dtc_module,
        ds_module,
        root_child
    };

    async function next() {
        const fn = pipeline[index++];
        if (fn) {
            await fn(ctx, next);
        }
    }

    await next();

    if (ctx.engine) {
        return ctx.engine
    }
}