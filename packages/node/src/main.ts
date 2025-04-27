import { exec } from "./types";

export * from "./types";

async function main() {
    try {
        await exec({
            code: `use std::io::{ print };

            fun main(): unit {
                print("{}", 90);
            }
            `,
            config: {
                call_main: true
            }
        });

    } catch (e: any) {
        console.log(`main error: \n\n ${e}`)
    }
}

if (require.main == module) {
    main()
}