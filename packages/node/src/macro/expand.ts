import {
    ASTNode,
    ImportNode,
    Module,
    Cache,
    ErrorCodes,
    ExpandMacro,
    Type,
    RegArgs,
    FunctionDecNode,
    ArrayType,
    TokenType,
    Token,
    Parser
} from "@kithinji/tlugha-core";

import {
    EngineNode,
    lugha_fn,
    pipe_args,
    pipe_expandmacro,
    pipe_lp,
    pipe_procmacro,
    pipe_read
} from "../types";

import * as path from 'path';

import { existsSync } from "fs";


export class ExpandMacroNode extends ExpandMacro {

    constructor(
        public file: string,
        public rd: string,
        public wd: string,
        public root: Module,
        public lugha: lugha_fn,
        public ast?: ASTNode,
    ) {
        super(
            file,
            rd,
            wd,
            root,
            lugha,
            ast
        )
    }

    async run_macro(
        tokens: Type<any>[],
        node: ASTNode,
        macro: RegArgs
    ) {
        const a = path.parse(this.file);

        const fun = macro.node as FunctionDecNode;

        const attrs = fun.attributes;

        fun.attributes = undefined;
        fun.frame = macro.frame;
        fun.module = macro.module;

        const engine = await this.lugha({
            pipeline: [
                async (args: pipe_args, next: Function) => {
                    args.file_path = path.join(args.wd, args.file)
                    await next()
                },
                pipe_procmacro,
                pipe_expandmacro,
                async (args: pipe_args, next: Function) => {
                    if (macro.module == null) throw new Error("Macro doesn't have a module");

                    try {
                        const engine = new EngineNode(
                            args.file_path ?? "",
                            args.rd,
                            args.wd,
                            macro.module,
                            this.lugha,
                            args.ast,
                        );

                        await engine.run()

                        args.engine = engine;
                    } catch (e) {
                        throw e;
                    }
                }
            ],
            wd: a.dir,
            rd: a.dir,
            file: a.base,
            ast: fun
        })

        if (!engine) throw new Error("Undefined Engine");

        const result = await engine.call_main(
            fun.identifier.name,
            [new ArrayType(tokens)],
            true
        );

        fun.attributes = attrs;
        fun.frame = null;
        fun.module = null;

        const res_tokens = [];

        for (let t of result) {
            const m: Record<string, Function> = {
                "String": () => TokenType.String,
                "Number": () => TokenType.Number,
                "Identifier": (value: string) => {
                    let t: Record<string, string> = {
                        "let": TokenType.Let,
                        "impl": TokenType.Impl,
                        "fun": TokenType.Fun,
                    }

                    return value in t ? t[value] : TokenType.Identifier
                },
                "Op": (value: string) => {
                    let t: Record<string, string> = {
                        "+": TokenType.Plus,
                        "=": TokenType.Equals,
                        ";": TokenType.SemiColon,
                        "(": TokenType.LeftParen,
                        ")": TokenType.RightParen,
                        "{": TokenType.LeftBrace,
                        "}": TokenType.RightBrace,
                        "[": TokenType.LeftBracket,
                        "]": TokenType.RightBracket,
                        "::": TokenType.Scope,
                        ":": TokenType.Colon,
                        ">=": TokenType.GTE,
                        "<=": TokenType.LTE,
                        ">": TokenType.GT,
                        "<": TokenType.LT,
                        ",": TokenType.Comma,
                        ".": TokenType.Dot,
                    }

                    return t[value];
                }
            };

            const value = t.getValue().getValue().pop();


            const token: Token = {
                type: m[t.tag](value),
                value: String(value),
                line: 0,
                column: 0,
                line_str: ""
            };

            res_tokens.push(token);
        }

        if (res_tokens[res_tokens.length - 1].type !== TokenType.EOF)
            res_tokens.push({
                type: TokenType.EOF,
                value: "",
                line: 0,
                column: 0,
                line_str: ""
            })

        let parser = new Parser(res_tokens, "");
        let ast = parser.parse();

        return ast;
    }

    find_mod_in_lib_hierarchy(startDir: string, moduleName: string): string | null {
        let currentDir = path.resolve(startDir);

        while (true) {
            const libPath = path.join(currentDir, "lib", moduleName, "__mod__.la");

            if (existsSync(libPath)) {
                return libPath;
            }

            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) break; // Reached root
            currentDir = parentDir;
        }

        return null;
    }

    async visitImport(
        node: ImportNode,
        args?: Record<string, any>
    ) {
        const originalWd = this.wd;
        const name = node.identifier.name;

        let fileToImport = `${name}.la`;
        let importWd = originalWd;

        const localPath = path.join(originalWd, fileToImport);
        const localModPath = path.join(originalWd, name, "__mod__.la");

        let modPath: string | null = null;

        if (existsSync(localPath)) {
            modPath = localPath;
        } else if (existsSync(localModPath)) {
            fileToImport = "__mod__.la";
            importWd = path.join(originalWd, name);
            modPath = path.join(importWd, fileToImport);
        } else {
            const foundLibPath = this.find_mod_in_lib_hierarchy(this.rd, name);

            if (foundLibPath) {
                fileToImport = "__mod__.la";
                importWd = path.dirname(foundLibPath);
                modPath = foundLibPath;
            } else {
                this.error(
                    node,
                    ErrorCodes.runtime.UNDEFINED_MODULE,
                    `Could not find module '${name}'.`,
                    "Import statements must reference a valid module file or directory.",
                    `No file '${fileToImport}' or '${name}/__mod__.la' found in '${originalWd}', and module was not found in library paths.`,
                    [`${name}.la`, `${name}/__mod__.la`],
                    `Example: import ${name}`
                );
            }
        }

        const cache = Cache.get_instance("expand_macro");
        let module = cache.has_mod(modPath)
            ? cache.get_mod(modPath)
            : new Module(name, null, `expand_macro`);

        args?.module.add_submodule(module);

        if (!cache.has_mod(modPath)) {
            cache.add_mod(modPath, module);

            await this.lugha({
                pipeline: [
                    pipe_read,
                    pipe_lp,
                    async (args: pipe_args, next: Function) => {
                        const tc = new ExpandMacro(
                            args.file_path ?? "",
                            args.rd,
                            args.wd,
                            module,
                            this.lugha,
                            args.ast
                        );

                        await tc.run()
                    }
                ],
                file: fileToImport,
                wd: importWd,
                rd: this.rd,
            });
        }
    }
}