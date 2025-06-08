import { spawn } from "child_process"
import { builtin } from "@kithinji/tlugha-core"
import { readFile, writeFile } from "fs/promises"

builtin["__read__"] = {
    type: "function",
    async: true,
    signature: "(path: str, encoding: str) -> str",
    exec: async (args: any[]) => {
        try {
            const res = await readFile(args[0], args[1]);
            return res;
        } catch (e: any) {
            console.log(e);
            throw e;
        }
    }
}

builtin["__write__"] = {
    type: "function",
    async: true,
    signature: "(str, str) -> unit",
    exec: async (args: any[]) => {
        try {
            await writeFile(args[0], args[1]);
        } catch (e: any) {
            throw e;
        }
    }
}

builtin["__shell__"] = {
    type: "function",
    async: true,
    signature: "(str) -> str",
    exec: async (args: any[]) => {
        return new Promise((resolve, reject) => {
            const process = spawn(args[0], { shell: true });

            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(error || `Process exited with code ${code}`));
                }
            });
        });
    }
}

export { builtin };