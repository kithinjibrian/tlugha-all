export let global_counter = gen_id();

export function* gen_id() {
    let n = 0;
    while (true) {
        yield n;
        n++;
    }
}