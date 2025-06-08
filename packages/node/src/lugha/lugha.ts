import {
    Lexer,
    TC_Module,
    Parser,
    Module,
    ASTNode,
    ExtensionStore,
    ASTCache,
    TypeChecker,
    BorrowChecker
} from "@kithinji/tlugha-core";

import {
    EngineNode,
} from "../types"

import * as path from 'path';
import { readFile } from "fs/promises";
import { ExtEngine } from "./ext_engine";
import { ExtProcMacro } from "./ext_procmacro";
import { ExpandMacro } from "../macro/expand";
import { ExtTypeChecker } from "./ext_typechecker";

export type pipe_args = {
    wd: string;
    rd: string;
    file: string;
    ast?: ASTNode;
    code?: string;
    file_path?: string,
    engine?: EngineNode,
    pm_module?: Module
}

export type lugha_fn = (args: {
    wd: string;
    rd: string;
    file: string;
    ast?: ASTNode;
    rt_module?: Module;
    pm_module?: Module;
    em_module?: Module;
    tc_module?: TC_Module;
    pipeline: ((args: pipe_args, next: Function) => void)[]
}) => Promise<EngineNode | undefined>;

export const pipe_read = async (args: pipe_args, next: Function) => {
    try {
        args.file_path = path.join(args.wd, args.file);

        const c = ASTCache.get_instance();
        if (!c.has_ast(args.file_path)) {
            args.code = await readFile(args.file_path, 'utf-8');
        }

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_lp = async (args: pipe_args, next: Function) => {
    if (args.ast) return await next(); // skip lexing/parsing

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

export const pipe_procmacro = async (args: pipe_args, next: Function) => {
    ExtensionStore.get_instance("macro").register(new ExtProcMacro(path.join(__dirname, "..")))
    args.pm_module = new Module("root", null, "procmacro_module");

    try {
        let pm = new EngineNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.pm_module,
            lugha,
            args.ast,
            "macro"
        );

        await pm.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_expandmacro = async (args: pipe_args, next: Function) => {
    if (!args.pm_module) return await next();

    try {
        let em = new ExpandMacro(
            args.file_path ?? "",
            args.rd,
            args.wd,
            args.pm_module,
            lugha,
            args.ast,
        );

        await em.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_typecheck = async (args: pipe_args, next: Function) => {
    ExtensionStore.get_instance("typechecker").register(new ExtTypeChecker(path.join(__dirname, "..")));

    try {
        const tc = new TypeChecker(
            args.file_path ?? "",
            args.rd,
            args.wd,
            new Module("root", null, "typecheck_module"),
            lugha,
            args.ast
        );

        await tc.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_borrowcheck = async (args: pipe_args, next: Function) => {
    ExtensionStore.get_instance("borrowchecker");

    try {
        const bc = new BorrowChecker(
            args.file_path ?? "",
            args.rd,
            args.wd,
            new Module("root", null, "borrowcheck_module"),
            lugha,
            args.ast
        );

        await bc.run()

        return await next();
    } catch (e) {
        throw e;
    }
}

export const pipe_engine = async (args: pipe_args, next: Function) => {
    ExtensionStore.get_instance().register(new ExtEngine(path.join(__dirname, "..")))
    try {
        const engine = new EngineNode(
            args.file_path ?? "",
            args.rd,
            args.wd,
            new Module("root", null, "engine_module"),
            lugha,
            args.ast,
        );

        await engine.run()

        args.engine = engine;
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
}) => {
    let index = 0;
    const ctx: pipe_args = {
        rd,
        wd,
        file,
        ast
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


//try {
// if (pm_module) {
//     let pm = new ProcMacroExt(
//         file_path,
//         rd,
//         wd,
//         ast,
//         pm_module,
//         lugha
//     );

//     await pm.run()
// }

// if (em_module) {
//     let em = new ExpandMacro(
//         file_path,
//         rd,
//         wd,
//         ast,
//         em_module,
//         lugha
//     );

//     await em.run()
// }

// if (tc_module) {
//     // let tc = new TypeChecker(
//     //     file_path,
//     //     ast,
//     //     tc_module,
//     //     lugha
//     // );

//     // await tc.run()
// }

// if (rt_module) {
//     const engine = new EngineNode(
//         file_path,
//         rd,
//         wd,
//         ast,
//         rt_module,
//         lugha
//     );

//     return await engine.run();
// }
//} catch (error: any) {
//    throw error;
//}