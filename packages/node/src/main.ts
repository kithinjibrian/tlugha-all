import { Type } from "@kithinji/tlugha-core";
import { exec } from "./types";

export * from "./types";

async function main() {
    try {
        return await exec({
            filepath: "code/src/app.la",
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