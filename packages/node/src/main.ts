// #!/usr/bin/env node

import { exec } from "./types";

export * from "./types";

async function main() {
    try {
        const args = process.argv.slice(2);

        if (!args[0]) {
            console.error("Usage: tlugha script.la");
            process.exit(1);
        }

        return await exec({
            filepath: args[0],
            config: {
                call_main: true
            }
        });

    } catch (e: any) {
        console.log(`main error: \n\n ${e}`)
    }
}

if (require.main == module) {
    main().then(e => {
        console.log(e)
    })
}