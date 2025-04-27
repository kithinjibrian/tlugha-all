type FileType = "file" | "folder";

export interface FileNode {
    type: FileType;
    name: string;
    content?: string;
    children?: FileNode[];
}

export class FS {
    private static instance: FS | null = null;

    private root: FileNode = {
        type: "folder",
        name: "/",
        children: [],
    };

    constructor() { }

    public static getInstance(): FS {
        if (!FS.instance) {
            FS.instance = new FS();
        }
        return FS.instance;
    }

    private findNode(path: string): FileNode | null {
        const parts = path.split("/").filter(Boolean);
        let current = this.root;

        for (const part of parts) {
            if (!current.children) return null;
            const next = current.children.find((child) => child.name === part);
            if (!next) return null;
            current = next;
        }

        return current;
    }

    mkdir(path: string, name: string): void {
        const parent = this.findNode(path);
        if (!parent || parent.type !== "folder") {
            throw new Error("Invalid folder path");
        }

        const existing = parent.children!.find(child => child.name === name);

        if (existing) {
            return;
        }

        parent.children!.push({
            type: "folder",
            name,
            children: [],
        });
    }

    writeFile(path: string, content: string, options?: { force?: boolean }): void {
        const parts = path.split("/").filter(Boolean);
        const base = parts.pop() || "";
        const folderPath = "/" + parts.join("/");

        const parent = this.findNode(folderPath);
        if (!parent || parent.type !== "folder") {
            throw new Error("Invalid folder path");
        }

        const existing = parent.children!.find(child => child.name === base);

        if (existing) {
            if (existing.type !== "file") {
                throw new Error("A folder with the same name already exists");
            }
            if (!options?.force) {
                throw new Error("File already exists. Use { force: true } to overwrite.");
            }

            existing.content = content;
            return;
        }

        parent.children!.push({
            type: "file",
            name: base,
            content,
        });
    }

    readFile(path: string): string {
        const node = this.findNode(path);
        if (!node || node.type !== "file") {
            throw new Error(`File not found '${path}'`);
        }
        return node.content || "";
    }

    ls(path: string = "/"): string[] {
        const node = this.findNode(path);
        if (!node || node.type !== "folder") {
            throw new Error("Folder not found");
        }
        return node.children!.map((child) => child.name);
    }

    exists(path: string): boolean {
        return this.findNode(path) !== null;
    }

    close() {
        this.root = {
            type: "folder",
            name: "/",
            children: [],
        };
    }
}