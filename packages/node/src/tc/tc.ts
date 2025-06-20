import {
    ASTNode,
    Module,
    TC,
    Cache,
    ImportNode,
    ErrorCodes
} from "@kithinji/tlugha-core";

import { existsSync } from "fs";
import * as path from 'path';
import { lugha, pipe_lp, pipe_read, pipe_tc } from "../types";

export class TCNode extends TC {
    constructor(
        file: string,
        rd: string,
        wd: string,
        root: Module,
        ast?: ASTNode,
    ) {
        super(
            file,
            rd,
            wd,
            root,
            ast
        )
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

        const cache = Cache.get_instance("tc");
        let module = cache.has_mod(modPath)
            ? cache.get_mod(modPath)
            : new Module(name, null, `tc`);

        args?.module.add_submodule(module);


        if (!cache.has_mod(modPath)) {
            cache.add_mod(modPath, module);

            await lugha({
                pipeline: [
                    pipe_read,
                    pipe_lp,
                    pipe_tc
                ],
                file: fileToImport,
                wd: importWd,
                rd: this.rd,
                tc_module: module
            });
        }
    }
}