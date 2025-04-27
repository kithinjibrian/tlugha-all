import {
    ASTNode,
    Engine,
    ImportNode,
    Module,
    Cache
} from "@kithinji/tlugha-core";

async function exists(url: string) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

export class EngineBrowser extends Engine {
    constructor(
        rd: string,
        wd: string,
        ast: ASTNode,
        root: Module,
        lugha: Function
    ) {
        super(
            rd,
            wd,
            ast,
            root,
            lugha
        )
    }

    async visitImport(
        node: ImportNode,
        _?: Record<string, any>
    ) {
        const originalWd = this.wd;
        const name = node.identifier.name;

        let fileToImport = `${name}.la`;
        let importWd = originalWd;

        const localPath = `${originalWd}/${fileToImport}`;
        const localModPath = `${originalWd}/${name}/__mod__.la`;

        let modPath: string | null = null;

        if (await exists(localPath)) {
            modPath = localPath;
        } else if (await exists(localModPath)) {
            fileToImport = "__mod__.la";
            importWd = `${originalWd}/${name}`;
            modPath = `${importWd}/${fileToImport}`;
        } else {
            throw new Error(`Couldn't find module: '${name}'`);
        }

        const cache = Cache.get_instance();
        let module = cache.has_mod(modPath)
            ? cache.get_mod(modPath)
            : new Module(name);

        this.current.add_submodule(module);

        if (!cache.has_mod(modPath)) {
            cache.add_mod(modPath, module);

            await this.lugha({
                file: fileToImport,
                wd: importWd,
                rd: this.rd,
                module
            });
        }
    }
}