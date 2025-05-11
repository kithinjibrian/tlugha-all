import { FS } from "../fs/fs";

const fs = FS.getInstance();

let core_init = false;

(function () {
    if (core_init) {
        return;
    }

    const fs = FS.getInstance();
    fs.mkdir("/", "app");
    fs.mkdir("/app", "core");

    core_init = true;

    fs.writeFile("/app/core/__mod__.la",
        `
enum Result<T, E> {
    Ok(T),
    Err(E)
}

impl Result {
    fun unwrap(self: Self): T {
        match(self) {
            Result::Ok(val) => val,
            Result::Err(err) => root::builtin::__panic__("called \`Result:: unwrap()\` on an \`Err\` value: {}".format(err))
        } 
    }

    fun expect(self: Self, message: string): unit {
        match(self) {
            Result::Ok(val) => val,
            Result::Err(err) => root::builtin::__panic__(message)
        }
    }
}

enum Option<T> {
    Some(T),
    None
}

impl Option {
    fun unwrap(self: Self): T {
        match(self) {
            Option::Some(val) => val,
            Option::None => root::builtin::__panic__("called \`Option:: unwrap()\` on an \`None\` value")
        } 
    }

    fun expect(self: Self, message: string): T {
        match(self) {
            Result::Ok(val) => val,
            Result::Err(err) => root::builtin::__panic__(message)
        }
    }
}
`)
})()