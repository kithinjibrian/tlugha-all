export * from "./types";

// import { FS } from "./fs/fs";
// import { exec } from "./types";

// async function main() {
//     const fs = FS.getInstance();

//     fs.writeFile("/api.la", `
// fun a(): unit {
//     return 9011;
// }
// `)

//     let code = `
// import api;

// use std::io::{ print };

// fun main(): unit {
//     print("{}", api::a());
// }
//     `

//     try {
//         await exec({
//             code,
//             config: {
//                 call_main: true
//             }
//         });

//     } catch (e: any) {
//         console.log(`main error: \n\n ${e}`)
//     }
// }

// main()