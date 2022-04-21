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

/** Enumerations for express way to encode a number on buffers */
export enum Relaxations {
    /** Write numbers with compression algorithms */
    Canonical = 'Canonical',
    /** Write numbers as full size */
    Full      = 'Full',
    /** Write numbers as their original size */
    None      = 'None',
}
/** String keys available to express a way to encode a number on buffers */
export type RelaxationKeys = keyof typeof Relaxations;
/** Way to express the number encoding on buffers */
export type Relaxation = Relaxations | RelaxationKeys;

/** Possible types for encoding */
export type EncodeType = 'uint8' | 'uint32' | 'uint64' | 'int32' | 'float32' | 'float64';
/** A generic numeric array-like accessible object */
export type NumericArray = { [key: number]: number, length: number };