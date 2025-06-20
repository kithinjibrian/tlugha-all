import {
    ASTNode,
    ImportNode,
    Module,
    XM_Frame,
    XMachina,
    Cache,
} from "@kithinji/tlugha-core";

import { existsSync } from "fs";
import * as path from 'path';
import { pipe_read, pipe_lp, pipe_args, lugha, pipe_xmachina } from "../types";

export class XMachinaNode extends XMachina {
    constructor(
        file: string,
        rd: string,
        wd: string,
        root: Module,
        ast?: ASTNode,
        phase?: string
    ) {
        super(
            file,
            rd,
            wd,
            root,
            ast,
            phase
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
        { frame }: { frame: XM_Frame }
    ) {
        const states: Record<string, () => Promise<boolean>> = {
            runtime: async () => {
                if (frame.state.mount()) {
                    frame.state.set("error", null);
                    frame.state.set("file_to_import", null);
                    frame.state.set("import_wd", null);
                    frame.state.set("module", null);
                }

                const originalWd = this.wd;
                const name = node.identifier.name;

                let file_to_import = `${name}.la`;
                let import_wd = originalWd;

                frame.state.set("file_to_import", file_to_import);
                frame.state.set("import_wd", import_wd);

                const localPath = path.join(originalWd, file_to_import);
                const localModPath = path.join(originalWd, name, "__mod__.la");

                let modPath: string | null = null;

                if (existsSync(localPath)) {
                    modPath = localPath;
                } else if (existsSync(localModPath)) {
                    file_to_import = "__mod__.la";
                    import_wd = path.join(originalWd, name);
                    modPath = path.join(import_wd, file_to_import);
                } else {
                    const foundLibPath = this.find_mod_in_lib_hierarchy(this.rd, name);

                    if (foundLibPath) {
                        file_to_import = "__mod__.la";
                        import_wd = path.dirname(foundLibPath);
                        modPath = foundLibPath;
                    } else {
                        console.log("error", originalWd, file_to_import)
                        frame.state.phase = "error";
                        return false;
                    }
                }

                const cache = Cache.get_instance(this.phase);
                let module = cache.has_mod(modPath)
                    ? cache.get_mod(modPath)
                    : new Module(name, null, `${this.phase}-module`);

                frame.state.set("module", module);

                frame.module.add_submodule(module);

                if (!cache.has_mod(modPath)) {
                    cache.add_mod(modPath, module);

                    frame.state.phase = "eval";
                    return false;
                }

                frame.state.phase = frame.exit;
                return false;
            },
            eval: async () => {
                const file_to_import = frame.state.get("file_to_import");
                const import_wd = frame.state.get("import_wd");
                const module = frame.state.get("module");

                frame.state.phase = frame.exit;

                await lugha({
                    pipeline: [
                        pipe_read,
                        pipe_lp,
                        pipe_xmachina,
                    ],
                    file: file_to_import,
                    wd: import_wd,
                    rd: this.rd,
                    xm_module: module,
                    phase: this.phase
                });

                return false;
            },
            error: async () => {
                this.error(frame.state.get("error"));
            },
            done: async () => {
                return true;
            }
        }

        return await this.transition(states, frame.state.phase);
    }
}