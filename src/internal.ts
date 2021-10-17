type IArray<T> = { [key: number]: T, length: number };
export function insert<T>(target: T[], ...args: IArray<T>[]): T[] {
    let d: IArray<T>;
    for (var i = 1; i < args.length; ++i) {
        d = args[i]!;
        for (var j = 0; j < (d.length || 0); ++j) { target.push(d[j]!); }
    }
    return target;
}

export function protect<T, K extends keyof T>(target: T, key: K, value: T[K], enumerable: boolean = true) {
    Object.defineProperty(target, key, {
        value, configurable: false,
        writable: false, enumerable
    });
}