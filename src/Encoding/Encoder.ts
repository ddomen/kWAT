/**
  * @license kwat 0.1.0 Copyright (C) 2022 Daniele Domenichelli
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

import { EncodeType, NumericArray, Relaxation, Relaxations } from './Relaxations';

const zeros = '00000000000000000000000000000000';

type Args<C> = C extends any[] ? C : [C];

/** Object that express its own way to be encoded */
export interface IEncodable<Context = any[]> {
    /** Encode this object through an encoder
     * @param {IEncoder} encoder the encoder target of the writing
     * @param {...Args<Context>} context the arguments to be passed in the encoding procedure as a context
     * @return {*} returns any value (usually ignored)
    */
    encode(encoder: IEncoder, ...context: Args<Context>): any;
}

/**
 * Object that can encode numbers and objects
 * usually into a memory/file buffer
 * */
export interface IEncoder {
    /** Express the default relaxation of the encoder */
    relaxation: Relaxation;
    /** The actual number of written bytes */
    get size(): number;
    /** Encode a unsigned byte
     * @param {number} value unsigned byte number [0x00, 0xff]
     * @return {IEncoder} the IEncoder itself (chainable method)
     */
    uint8(value: number): this;
    /** Encode a unsigned int
     * @param {number} value unsigned int number [0x00000000, 0xffffffff]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    uint32(value: number, relaxed?: Relaxation): this;
    /** Encode a unsigned long
     * @param {(number|bigint)} value unsigned long number (or bigint) [0x0000000000000000, 0xffffffffffffffff]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    uint64(value: number | bigint, relaxed?: Relaxation): this;
    /** Encode a unsigned long
     * @param {number} hi unsigned int number representing
     *           high (first 32) bits of an unsigned long
     *           [0x00000000, 0xffffffff]
     * @param {number} lo unsigned int number representing
     *           low (last 32) bits of an unsigned long
     *           [0x00000000, 0xffffffff]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    uint64(hi: number, lo: number, relaxed?: Relaxation): this;
    /** Encode a signed int
     * @param {number} value signed int number [±2.147.483.647]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    int32(value: number, relaxed?: Relaxation): this;
    /** Encode a signed long
     * @param {(number|bigint)} value signed long number (or bigint) [±9.223.372.036.854.775.807]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    int64(value: number | bigint, relaxed?: Relaxation): this;
    /** Encode a signed long
     * @param {number} hi signed int number representing
     *           high (first 32) bits of an unsigned long.
     *           The first bit represent the sign of the whole number.
     *           [0x00000000, 0xffffffff]
     * @param {number} lo unsigned int number representing
     *           low (last 32) bits of an unsigned long
     *           [0x00000000, 0xffffffff]
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    int64(hi: number, lo: number, relaxed?: Relaxation): this;
    /** Encode a floating number
     * @param {number} value number as a floating point
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    float32(value: number, relaxed?: Relaxation): this;
    /** Encode a double floating number
     * @param {number} value number as a floating point
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
     * */
    float64(value: number, relaxed?: Relaxation): this;
    /** Encode a vector of encodable objects (includes length)
     * @param {IEncodable[]} value the vector of encodable objects
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: IEncodable[]): this;
    /** Encode a vector of encodable objects (includes length)
     * @param {IEncodable[]} value the vector of encodable objects
     * @param {...Args<C>} context the arguments to be passed in the encoding procedure as a context
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector<C>(value: IEncodable<C>[], ...context: Args<C>): this;
    /** Encode a string as a vector of utf8 chars (includes length)
     * @param {string} value the encoded string
     * @param {"utf8"} [type=utf8] the vector elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: string, type?: 'utf8'): this;
    /** Encode a string array as a vector of vectors utf8 chars (includes length)
     * @param {string[]} value the string array to be encoded
     * @param {"utf8"} [type=utf8] the vector array elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: string[], type?: 'utf8'): this;
    /** Encode a vector of longs (includes length)
     * @param {(number|bigint)[]} value the vector of longs to be encoded
     * @param {'uint64'} [type] the vector array elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: (number | bigint)[], type: 'uint64'): this;
    /** Encode a vector of ints (includes length)
     * @param {number[]} value the vector of ints to be encoded
     * @param {'uint32'} [type] the vector array elements encoding type
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    /** Encode a vector of numbers (includes length)
     * @param {number[]} value the vector of numbers to be encoded
     * @param {EncodeType} [type] the vector array elements encoding type
     * @param {Relaxation} [relaxed] desired relaxation of the number compression (if possible)
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    vector(value: number[], type: EncodeType, relaxed?: Relaxation): this;
    /** Encode a sequence of encodable objects (non including length)
     * @param {IEncodable[]} value the sequence of encodable objects
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array(value: IEncodable[]): this;
    /** Encode a sequence of encodable objects (non including length)
     * @param {IEncodable[]} value the sequence of encodable objects
     * @param {...Args<C>} context the arguments to be passed in the encoding procedure as a context
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array<C>(value: IEncodable<C>[], ...context: Args<C>): this;
    /** Encode a string as a utf8 char sequence (non including length)
     * @param {string} value the encoded string
     * @param {"utf8"} [type=utf8] the sequence elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array(value: string, type?: 'utf8'): this;
    /** Encode a string array as a sequence of utf8 char sequences (non including length)
     * @param {string[]} value the string sequence to be encoded
     * @param {"utf8"} [type=utf8] the sequence array elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
     * */
    array(value: string[], type?: 'utf8'): this;
    /** Encode a sequence of longs (non including length)
     * @param {(number|bigint)[]} value the sequence of longs to be encoded
     * @param {'uint64'} [type] the sequence array elements encoding type
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array(value: (number | bigint)[], type: 'uint64'): this;
    /** Encode a sequence of ints (non including length)
     * @param {number[]} value the sequence of ints to be encoded
     * @param {'uint32'} [type] the sequence array elements encoding type
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    /** Encode a sequence of numbers (non including length)
     * @param {number[]} value the vector of numbers to be encoded
     * @param {EncodeType} [type] the vector array elements encoding type
     * @param {Relaxation} [relaxed] desired relaxation of the number compression (if possible)
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    array(value: number[], type: EncodeType, relaxed?: Relaxation): this;
    /** Encode a string (including length)
     * @param value the encoded string (assuming utf8 encoding)
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    string(value: string): this;
    /** Encode a string as utf8 char vector (non including length)
     * @param value the encoded string (assuming utf8 encoding)
     * @return {IEncoder} the IEncoder itself (chainable method)
     * */
    utf8(value: string): this;
    /** Encode an encodable object
     * @param {IEncodable} value the object to be encoded
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    encode(value: IEncodable): this;
    /** Encode an encodable object
     * @param {IEncodable} value the object to be encoded
     * @param {...Args<C>} context the arguments to be passed in the encoding procedure as a context
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    encode<C>(value: IEncodable<C>, ...context: Args<C>): this;
    /** Append bytes to the current buffer
     * @param {(IEncoder|NumericArray)} data the data to be appended
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    append(data: IEncoder | NumericArray): this;
    /** Generate a similar encoder
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    spawn(): IEncoder;
    /** Retrieve the written buffer
     * @return {Uint8Array} the written buffer
    */
    getBuffer(): Uint8Array;
}
/** Constructor of an encoder */
export type IEncoderCtor = new() => IEncoder;

// function signed32(x: number): number {
//     return (x & 0x80000000) ? (-0x7fffffff + (x & 0x7fffffff) - 1) : x;
// }

function int64(signed: boolean, hi: number | bigint, lo?: number | Relaxation, relaxed?: Relaxation): [ string | number, Relaxation | undefined ] {
    let value;
    if ((typeof(lo) === 'undefined' && typeof(relaxed) === 'undefined') || typeof(lo) === 'string') {
        if (signed ? (Number(hi) > -0x7fffffff && Number(hi) < 0x7fffffff) : (Number(hi) <= 0xffffffff)) { value = Number(hi); }
        else {
            value = hi.toString(2);
            if (value.length < 64) {
                if (signed) { value = (hi < 0 ? '1' : '0') + zeros.slice(value.length + 1) + value; }
                else { value = (zeros + zeros).slice(value.length) + value; }
            }
        }
        relaxed = lo || Relaxations.Canonical;
    }
    else if (hi) {
        let h = Number(hi).toString(2), l = Number(lo).toString(2);
        value = zeros.slice(h.length) + h + zeros.slice(l.length) + l;
    }
    else { value = Number(lo); }
    relaxed = (relaxed || '') in Relaxations ? relaxed : Relaxations.Canonical;
    return [ value, relaxed ];
}

function enc_u_leb128(bits: string | number, buffer: number[], maxBitSize?: number): void {
    let get: (n: any) => number,
        shift: (n: any) => any,
        zero: (n: any) => boolean;
    if (typeof(bits) === 'number' && bits <= 0xffffffff) {
        bits = Number(bits) >>> 0;
        get = (n: any) => n & 0x7f;
        shift = (n: any) => n >>> 7;
        zero = (n: any) => n === 0;
    }
    else {
        if (typeof(bits) === 'number') { bits = (bits < 0 ? -bits : bits).toString(2); }
        bits = '' + bits;
        get = (n: any) => parseInt(n.slice(-7), 2);
        shift = (n: any) => n.slice(0, -7);
        zero = (n: any) => n.indexOf('1') < 0;
    }
    maxBitSize = maxBitSize || Infinity;
    let byte, i = 0;
    do {
        byte = get(bits);
        bits = shift(bits);
        if (!zero(bits)) { byte |= 0x80; }
        buffer.push(byte);
        if ((i += 7) > maxBitSize) { throw new Error('Unsigned Int to encode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
    }
    while (byte & 0x80);
}
function enc_s_leb128(bits: string | number, buffer: number[], maxBitSize?: number): void {
    let get: (n: any) => number,
        shift: (n: any) => any,
        zero: (n: any) => boolean,
        n1: (n: any) => boolean;
    if (typeof(bits) === 'number' && bits <= 0xffffffff) {
        bits = Number(bits) >>> 0;
        get = (n: any) => n & 0x7f;
        shift = (n: any) => n >> 7;
        zero = (n: any) => n === 0;
        n1 = (n: any) => n === -1;
    }
    else {
        if (typeof(bits) === 'number' && bits < 0) { bits = -bits; }
        bits = bits.toString(2);
        get = (n: any) => parseInt(n.slice(-7), 2);
        shift = (n: any) => n.slice(0, -7);
        zero = (n: any) => n.indexOf('1') >= 0;
        n1 = (n: any) => !(n.length % 7) && n.indexOf('0') < 0;
    }
    maxBitSize = maxBitSize || Infinity;
    let byte, i = 0;
    while (true) {
        byte = get(bits);
        bits = shift(bits);
        if (
            (zero(bits) && !(byte & 0x40)) ||
            (n1(bits)   &&  (byte & 0x40))
        ) { buffer.push(byte); break; }
        buffer.push(byte | 0x80);
        if ((i += 7) > maxBitSize) { throw new Error('Unsigned Int to encode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
    }
}

function enc_32_ieee754_2019(value: number): number {
    let bytes = 0;
    switch (value) {
        case Number.POSITIVE_INFINITY: bytes = 0x7F800000; break;
        case Number.NEGATIVE_INFINITY: bytes = 0xFF800000; break;
        case +0.0: bytes = 0x40000000; break;
        case -0.0: bytes = 0xC0000000; break;
        default:
            if (Number.isNaN(value)) { bytes = 0x7FC00000; break; }

            if (value <= -0.0) {
                bytes = 0x80000000;
                value = -value;
            }

            let exponent = Math.floor(Math.log(value) / Math.log(2));
            let significand = ((value / Math.pow(2, exponent)) * 0x00800000) | 0;

            exponent += 127;
            if (exponent >= 0xFF) {
                exponent = 0xFF;
                significand = 0;
            } else if (exponent < 0) exponent = 0;

            bytes = bytes | (exponent << 23);
            bytes = bytes | (significand & ~(-1 << 23));
        break;
    }
    return bytes;
}

function enc_64_ieee754_2019(value: number): [ number, number ] {
    var hi = 0, lo = 0;
    switch (value) {
        case Number.POSITIVE_INFINITY: hi = 0x7FF00000; break;
        case Number.NEGATIVE_INFINITY: hi = 0xFFF00000; break;
        case +0.0: hi = 0x40000000; break;
        case -0.0: hi = 0xC0000000; break;
        default:
            if (Number.isNaN(value)) { hi = 0x7FF80000; break; }

            if (value <= -0.0) {
                hi = 0x80000000;
                value = -value;
            }

            let exponent = Math.floor(Math.log(value) / Math.log(2));
            let significand = Math.floor((value / Math.pow(2, exponent)) * Math.pow(2, 52));

            lo = significand & 0xFFFFFFFF;
            significand /= Math.pow(2, 32);

            exponent += 1023;
            if (exponent >= 0x7FF) {
                exponent = 0x7FF;
                significand = 0;
            } else if (exponent < 0) exponent = 0;

            hi = hi | (exponent << 20);
            hi = hi | (significand & ~(-1 << 20));
        break;
    }
    return [ hi, lo ];
}

/**
 * Object that can encode numbers and objects
 * usually into a memory/file buffer.
 * Standard implementation of IEncoder
 * */
export class Encoder implements IEncoder {
    /** The byte buffer accumulator */
    private _data: number[] = [];

    public get size(): number { return this._data.length; }
    public relaxation: Relaxation = Relaxations.Canonical;

    public getBuffer(): Uint8Array { return new Uint8Array(this._data); }
    
    public uint8(value: number): this { this._data.push(value & 0xff); return this; }
    public uint32(value: number, relaxed?: Relaxation): this {
        switch (relaxed || this.relaxation) {
            case Relaxations.None:
                this._data.push(
                     value         & 0xff,
                    (value >>>  8) & 0xff,
                    (value >>> 16) & 0xff,
                    (value >>> 24) & 0xff
                );
                break;
            case Relaxations.Full:
                this._data.push(
                    ( value         & 0x7f) | 0x80,
                    ((value >>>  7) & 0x7f) | 0x80,
                    ((value >>> 14) & 0x7f) | 0x80,
                    ((value >>> 21) & 0x7f) | 0x80,
                    ((value >>> 28) & 0xff)
                )
                break;
            case Relaxations.Canonical:
            default: enc_u_leb128(value, this._data, 32); break;
        }
        return this;
    }
    public uint64(value: number | bigint, relaxed?: Relaxation): this;
    public uint64(hi: number, lo: number, relaxed?: Relaxation): this;
    public uint64(hi: number | bigint, lo?: number | Relaxation, relaxed?: Relaxation): this {
        let i = int64(false, hi, lo, relaxed), value = i[0];
        relaxed = i[1];
        switch (relaxed || this.relaxation) {
            case Relaxations.None: {
                let h, l;
                if (typeof(value) === 'number') { h = 0; l = value; }
                else {
                    h = parseInt(value.slice(0, 32), 2);
                    l = parseInt(value.slice(32), 2);
                } 
                this._data.push(
                    l          & 0xff,
                    (l >>>  8) & 0xff,
                    (l >>> 16) & 0xff,
                    (l >>> 24) & 0xff,
                    h          & 0xff,
                    (h >>>  8) & 0xff,
                    (h >>> 16) & 0xff,
                    (h >>> 24) & 0xff
                );
                break;
            }
            case Relaxations.Full: {
                let h, l;
                if (typeof(value) === 'number') { h = 0; l = value; }
                else {
                    h = parseInt(value.slice(0, 32), 2);
                    l = parseInt(value.slice(32), 2);
                } 
                this._data.push(
                    ( l         & 0x7f) | 0x80,
                    ((l >>>  8) & 0x7f) | 0x80,
                    ((l >>> 16) & 0x7f) | 0x80,
                    ((l >>> 24) & 0x7f) | 0x80,
                    ( h         & 0x7f) | 0x80,
                    ((h >>>  8) & 0x7f) | 0x80,
                    ((h >>> 16) & 0x7f) | 0x80,
                    ((h >>> 24) & 0xff)
                );
                break;
            }
            case Relaxations.Canonical:
            default: enc_u_leb128(value, this._data, 64); break;
        }
        return this;
    }
    public int32(value: number, relaxed?: Relaxation): this {
        relaxed ||= this.relaxation;
        if (relaxed === Relaxations.Canonical) {
            enc_s_leb128(value, this._data);
            return this;
        }
        return this.uint32(value, relaxed);
    }
    public int64(value: number | bigint, relaxed?: Relaxation): this;
    public int64(hi: number, lo: number, relaxed?: Relaxation): this
    public int64(hi: number | bigint, lo?: number | Relaxation, relaxed?: Relaxation): this {
        let i = int64(true, hi, lo, relaxed),
            value = i[0];
        relaxed = i[1];
        switch (relaxed || this.relaxation) {
            case Relaxations.Full:
            case Relaxations.None:
                throw new Error('Not yet implemented');
            case Relaxations.Canonical:
            default: enc_s_leb128(value, this._data, 64); break;
        }
        return this;
    }
    public float32(value: number): this {
        return this.uint32(enc_32_ieee754_2019(value), Relaxations.None);
    }
    public float64(value: number): this {
        return this.uint64(...enc_64_ieee754_2019(value), Relaxations.None);
    }

    public vector(value: IEncodable[]): this;
    public vector<C extends any[] = []>(value: IEncodable<C>[], ...context: C): this;
    public vector(value: string, type?: 'utf8'): this;
    public vector(value: string[], type?: 'utf8'): this;
    public vector(value: number[], type: 'uint64'): this;
    public vector(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    public vector(value: number[], type: EncodeType, ...args: any[]): this;
    public vector(value: string | string[] | number[] | IEncodable[], type?: EncodeType | 'utf8', ...args: any[]): this {
        this.uint32(value.length);
        return this.array(value as any, type as any, ...args);
    }

    public array(value: IEncodable[]): this;
    public array<C extends any[] = []>(value: IEncodable<C>[], ...context: C): this;
    public array(value: string, type?: 'utf8'): this;
    public array(value: string[], type?: 'utf8'): this;
    public array(value: number[], type: 'uint64'): this;
    public array(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    public array(value: number[], type: EncodeType, ...args: any[]): this;
    public array(value: string | string[] | number[] | IEncodable[], type?: EncodeType | 'utf8', ...args: any[]): this {
        if (!value.length) { return this; }
        if (typeof(value) === 'string') { return this.utf8(value); }
        let ftype = typeof(value[0]);
        if (ftype === 'object') {
            if (value.some(v => typeof(v) !== 'object' || typeof(v.encode) != 'function')) {
                throw new Error('Unable to encode non-numeric/non-string/non-compilable/mixed vector');
            }
            value.forEach(v => this.encode(v as IEncodable<any[]>, type as any, ...args));
            return this;
        }
        if (value.map(v => typeof(v)).some(v => (v !== 'number' && v !== 'string') || v !== ftype)) {
            throw new Error('Unable to encode non-numeric/non-string/non-compilable/mixed vector');
        }
        if (ftype === 'string') { value.forEach(v => this.utf8(v as string)); return this; }
        else if (!type || !(type in this)) { throw new Error('Invalid encoding type for vector: \'' + type + '\''); }
        if (type === 'uint64') { value.forEach(v => this.uint64(v as number)); }
        else {
            let cb = this[type as EncodeType].bind(this);
            value.forEach(v => cb(v as number, ...args));
        }
        return this;
    }

    public string(value: string): this { return this.vector(value); }
    public utf8(value: string): this {
        for (let i = 0; i < value.length; ++i) { this._data.push(value.charCodeAt(i)); }
        return this;
    }

    public encode(value: IEncodable): this;
    public encode<C extends any[] = []>(value: IEncodable<C>, ...context: C): this;
    public encode(value: IEncodable<any[]>, ...context: any[]): this {
        value.encode(this, ...context);
        return this;
    }

    public append(data: IEncoder | NumericArray): this {
        if ('getBuffer' in data) { data = data.getBuffer(); }
        for (let k = 0; k < data.length; ++k) { this._data.push((data[k] || 0) & 0xff); }
        return this;
    }

    public spawn(): IEncoder { return new Encoder(); }
}