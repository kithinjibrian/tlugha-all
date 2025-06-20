import { exec } from "../../src/main";

test('Checks if map functions work', async () => {
    await exec({
        filepath: "test/map/get.la",
        config: {
            call_main: true
        }
    });
});