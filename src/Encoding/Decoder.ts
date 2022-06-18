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

import { KWatError } from '../errors';
import { EncodeType, Relaxation, Relaxations } from './Relaxations';

const zeros = '00000000000000000000000000000000';

type Args<C> = C extends any[] ? C : [C];

/** Object that express its own way to be decoded */
export interface IDecodable<T, Context = any[]> {
    /** Decode this object through a decoder
     * @param {IDecoder} decoder the decoder target of the reading
     * @param {...Args<Context>} args the arguments to be passed in the decoding procedure as a context
     * @return {T} returns the given value
    */
    decode(decoder: IDecoder, ...args: Args<Context>): T;
}

/**
 * Object that can decode numbers and objects
 * usually from a memory/file buffer
 * */
export interface IDecoder {
    /** The current total size of ths buffer */
    get size(): number;
    /** The current number of bytes remaining to read from the buffer */
    get remaining(): number;
    /** The current number of bytes readed */
    offset: number;
    /** Express the default relaxation of the decoder */
    relaxation: Relaxation;
    /** Read a byte from the buffer without moving the offset
     * @return {number} the read byte
    */
    peek(): number;
    /** Read a unsigned byte from the buffer and move the offset
     * @return {number} the read unsigned byte
    */
    uint8(): number;
    /** Read an unsigned int (using leb128 - max 5 bytes) from the buffer and move the offset
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {number} the read unsigned int
    */
    uint32(relaxed?: Relaxation): number;
    /** Read an unsigned long (using leb128 - max 9 bytes) from the buffer and move the offset
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {number} the read unsigned long
    */
    uint64(relaxed?: Relaxation): number;
    /** Read a signed int (using leb128 - max 5 bytes) from the buffer and move the offset
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {number} the read signed int
    */
    int32(relaxed?: Relaxation): number;
    /** Read a float (single) from the buffer and move the offset
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {number} the read float (single)
    */
    float32(relaxed?: Relaxation): number;
    /** Read a float (double) from the buffer and move the offset
     * @param {Relaxation} [relaxed] desired relaxation of the number compression
     * @return {number} the read float (double)
    */
    float64(relaxed?: Relaxation): number;
    /** Read a vector of decodable objects (including length)
     * @param {IDecodable<T>} value the decodable description
     * @return {T[]} the vector of decoded objects
    */
    vector<T>(value: IDecodable<T>): T[];
    /** Read a vector of decodable objects (including length)
     * @param {IDecodable<T, C>} value the decodable description
     * @param {...C} context the arguments to be passed in the decoding procedure as a context
     * @return {T[]} the vector of decoded objects
    */
    vector<T, C>(value: IDecodable<T, C>, ...context: Args<C>): T[];
    /** Read a vector of characters as a string (including length - utf8 encodign assumed)
     * @param {"utf8"} type the type of the vector elements encoding
     * @return {string} the read string
     */
    vector(type: 'utf8'): string;
    /** Read a vector of characters as a string (including length)
     * @param {EncodeType} type the type of the vector elements encoding
     * @return {number[]} the read numeric vector
     */
    vector(type: EncodeType): number[];
    /** Read a sequence of decodable objects (non including length)
     * @param {IDecodable<T>} value the decodable description
     * @param {number} length the length of the sequence to read
     * @return {T[]} the sequence of decoded objects
    */
    array<T>(value: IDecodable<T>, length: number): T[];
    /** Read a sequence of decodable objects (non including length)
     * @param {IDecodable<T, C>} value the decodable description
     * @param {number} length the length of the sequence to read
     * @param {...C} args the arguments to be passed in the decoding procedure as a context
     * @return {T[]} the sequence of decoded objects
    */
    array<T, C>(value: IDecodable<T, C>, length: number, ...args: Args<C>): T[];
    /** Read a sequence of characters as a string (non including length - utf8 encodign assumed)
     * @param {"utf8"} type the type of the sequence elements encoding
     * @param {number} length the length of the sequence to read
     * @return {string} the read string
     */
    array(type: 'utf8', length: number): string;
    /** Read a sequence of characters as a string (non including length)
     * @param {EncodeType} type the type of the sequence elements encoding
     * @param {number} length the length of the sequence to read
     * @return {number[]} the read numeric sequence
     */
    array(type: EncodeType, length: number): number[];
    /** Read a sequence of characters as a string (non including length - utf8 encodign assumed)
     * @param {number} length the length of the sequence to read
     * @return {string} the read string
     */
    string(length: number): string;
    /** Read a sequence of characters as a string (non including length - utf8 encodign assumed)
     * @param {number} length the length of the sequence to read
     * @return {string} the read string
     */
    utf8(length: number): string;
    /** Decode an decodable object
     * @param {IDecodable<T, C>} value the decoding dedscription
     * @param {...C} context the arguments to be passed in the decoding procedure as a context
     * @return {IEncoder} the IEncoder itself (chainable method)
    */
    decode<T, C>(value: IDecodable<T, C>, ...context: Args<C>): T;
    /** Read a byte buffer of a certain length
     * @param {number} length the number of bytes to read
     * @return {Uint8Array} the read buffer
     */
    read(length: number): Uint8Array;
    /** Slice the current decoder to read (and consume) a part of the buffer
     * @param {number} length the number of bytes to slice (from the current position)
     * @return {IDecoder} the sliced bufer encapsulated in a decoder
    */
    slice(length: number): IDecoder;
}
/** Constructor of a decoder */
export type IDecoderCtor = new() => IDecoder;

function dec_u_leb128(decoder: IDecoder, maxBitSize?: number): number {
    maxBitSize = maxBitSize || Infinity;
    let result = 0, shift = 0, byte, i = 0;
    while (true) {
        byte = decoder.uint8();
        result |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) { return result; }
        shift += 7;
        if ((i += 7) > maxBitSize) { throw new KWatError('Unsigned Int to decode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
    }
}
function dec_s_leb128(decoder: IDecoder, maxBitSize?: number): number {
    maxBitSize = maxBitSize || Infinity;
    let result = 0, shift = 0, byte;
    while(true) {
        byte = decoder.uint8();
        result |= (byte & 0x7f) << shift;
        shift += 7;
        if (shift >= maxBitSize) { throw new KWatError('Signed Int to decode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
        if (!(byte & 0x80)) { return result | ((byte & 0x40) ? (-1 << shift) : 0x0); }
    }
}

export class Decoder implements IDecoder {
    /** The view used to read the current buffer */
    private _view: DataView;
    /** Current offset in the buffer */
    private _offset: number;
    public get size(): number { return this._view.byteLength; }
    public get remaining(): number { return this._view.byteLength - this._offset; }
    public get offset(): number { return this._offset; }
    public set offset(value: number) {
        if (value < 0 || value >= this._view.byteLength) { throw new KWatError('Offset out of range'); }
        this._offset = value;
    }
    public relaxation: Relaxation = Relaxations.Canonical;
    public constructor(buffer: ArrayBuffer, offset?: number, bytes?: number) { this._view = new DataView(buffer, offset, bytes); this._offset = 0; }

    /** Advance the current offset and returns the previous 
     * @param {number} amount the amount to shift the current offset
     * @return the previous offset (before increasing it)
    */
    private _advance(amount: number): number {
        let o = this._offset;
        this._offset += amount;
        return o;
    }

    public peek(): number { return this._view.getUint8(this._offset); }

    public uint8(): number { return this._view.getUint8(this._offset++); }
    public uint32(relaxed?: Relaxation): number {
        switch (relaxed || this.relaxation) {
            case Relaxations.None: return this._view.getUint32(this._advance(4), true);
            case Relaxations.Full:
            case Relaxations.Canonical:
            default: return dec_u_leb128(this, 32);
        }
    }
    public uint64(relaxed?: Relaxation): number {
        switch (relaxed || this.relaxation) {
            case Relaxations.None: { 
                let lo = this._view.getUint32(this._advance(4), true).toString(2);
                let hi = this._view.getUint32(this._advance(4), true).toString(2);
                return parseInt(zeros.slice(hi.length) + hi + zeros.slice(lo.length) + lo, 2);
            }
            case Relaxations.Full:
            case Relaxations.Canonical:
            default: return dec_u_leb128(this, 64);
        }
    }
    public int32(relaxed?: Relaxation): number {
        switch (relaxed || this.relaxation) {
            case Relaxations.None: return this._view.getInt32(this._advance(4), true);
            case Relaxations.Full:
            case Relaxations.Canonical:
            default: return dec_s_leb128(this, 32)
        }
    }
    public float32(): number { return this._view.getFloat32(this._advance(4), true); }
    public float64(): number { return this._view.getFloat64(this._advance(8), true); }
    
    public vector<T>(value: IDecodable<T>): T[];
    public vector<T, C>(value: IDecodable<T, C>, ...context: Args<C>): T[];
    public vector(type: 'utf8'): string;
    public vector(type: EncodeType): number[];
    public vector<T>(type: IDecodable<T> | 'utf8' | EncodeType, ...args: any[]): string | number[] | T[] {
        let length = this.uint32();
        return this.array(type as IDecodable<T>, length, ...args);
    }
    public array<T>(value: IDecodable<T>, length: number): T[];
    public array<T, C>(value: IDecodable<T, C>, length: number, ...context: Args<C>): T[];
    public array(type: 'utf8', length: number): string;
    public array(type: EncodeType, length: number): number[];
    public array<T, C>(type: IDecodable<T, C> | 'utf8' | EncodeType, length: number, ...args: Args<C>): string | number[] | T[] {
        if (type === 'utf8') { return this.utf8(length); }
        else if (typeof(type) === 'string') {
            let result = [];
            for (let i = 0; i < length; ++i) { result.push(this[type].call(this)); }
            return result;
        }
        else {
            let result = [];
            for (let i = 0; i < length; ++i) { result.push(type.decode(this, ...args)); }
            return result;
        }
    }
    public string(length: number): string { return this.utf8(length); }
    public utf8(length: number): string {
        return new TextDecoder('utf-8').decode(new Uint8Array(
            this._view.buffer,
            this._view.byteOffset + this._advance(length),
            length
        ));
    }
    public decode<T, C>(value: IDecodable<T, C>, ...context: Args<C>): T {
        return value.decode(this, ...context);
    }
    public slice(length: number): IDecoder {
        return new Decoder(
            this._view.buffer,
            this._view.byteOffset + this._advance(length),
            length
        );
    }
    
    public read(length: number): Uint8Array {
        return new Uint8Array(
            this._view.buffer,
            this._view.byteOffset + this._advance(length),
            length
        );
    }

    public toArray(): number[] {
        return Array.from(new Uint8Array(
            this._view.buffer,
            this._view.byteOffset,
            this._view.byteLength
        ));
    }

} 