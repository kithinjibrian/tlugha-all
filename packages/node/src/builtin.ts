import { spawn } from "child_process"
import { builtin } from "@kithinji/tlugha-core"
import { readFile, writeFile } from "fs/promises"
import * as https from "https"

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

builtin["__https_get__"] = {
    type: "function",
    signature: "(str, str) -> str",
    exec: (args: any[]) => {
        try {
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'CustomClient/1.0'
                }
            };

            const url = new URL(args[0])
            let data = false;

            https.get(args[0], (res) => {
                // When data is received
                data = true;

                res.on('data', (chunk) => {
                    console.log(chunk)
                });

                // When response ends
                res.on('end', () => {
                    console.log('Response:', data);
                });
            })

            // block until data is received
            // while (!data) {

            // }

            return 90;

        } catch (e: any) {
            console.log(e);
            throw e;
        }
    }
}

export { builtin };