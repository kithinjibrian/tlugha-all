export interface ParsedPath {
    dir: string;
    base: string;
    name: string;
    ext: string;
}

export function parse(path: string): ParsedPath {
    const parts = path.split("/").filter(Boolean);
    const base = parts.pop() || "";
    const dir = "/" + parts.join("/");

    const dotIndex = base.lastIndexOf(".");
    let name = base;
    let ext = "";

    if (dotIndex !== -1) {
        name = base.substring(0, dotIndex);
        ext = base.substring(dotIndex);
    }

    return { dir, base, name, ext };
}
