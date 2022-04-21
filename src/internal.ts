/*
 * Copyright (C) 2022 Daniele Domenichelli
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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