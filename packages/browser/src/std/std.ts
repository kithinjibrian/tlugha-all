import { FS } from "../fs/fs";

const fs = FS.getInstance();

export const write_std = () => {
    fs.writeFile("/std/__mod__.la",
        `
import io;
import math;
import time;
import fetch;
import option;
import result;
`
    )

    fs.writeFile("/std/io.la",
        `
fun print<T>(format: string, ...rest: Array<T>): unit {
    builtin::__print__(format, rest);
}

fun read(file: string, encoding: string): string {
    return builtin::__read__(file, encoding);
}

fun write(file: string, data: string): unit {
    builtin::__write__(file, data);
}
`
    )

    fs.writeFile("/std/fetch.la",
        `
fun get<T, C>(url: string, config: C): T {
  return builtin::__http_get__(url, config);
}

fun post<D, C, R>(url: string, data: D, config: C): R {
    return builtin::__http_post__(url, data, config);
}
`
    )

    fs.writeFile("/std/math.la",
        `
module consts {
    const PI = 3.141592653589793;
    const E = 2.718281828459045;
    const SQRT2 = 1.4142135623730951;
    const SQRT1_2 = 0.7071067811865476;
    const LN2 = 0.6931471805599453;
    const LN10 = 2.302585092994046;
    const LOG2E = 1.4426950408889634;
    const LOG10E = 0.4342944819032518;
}

fun sqrt(a: number): number {
    return a.sqrt();
}

fun abs(a: number): number {
    return a.abs();
}

fun ceil(a: number): number {
    return a.ceil();
}

fun floor(a: number): number {
    return a.floor();
}

fun round(a: number): number {
    return a.round();
}

fun trunc(a: number): number {
    return a.trunc();
}

fun pow(a: number, b: number): number {
    return a.pow(b);
}
`
    )

    fs.writeFile("/std/option.la",
        `
enum Option<V> {
    Some(V),
    None
}
`)

    fs.writeFile("/std/result.la",
        `
enum Result<T, E> {
    Ok(T),
    Err(E)
}
`)

    fs.writeFile("/std/time.la",
        `
fun now(): Date {
    return builtin::__now__();
}
`)
}