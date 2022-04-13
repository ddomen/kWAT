const zeros = '00000000000000000000000000000000';

type EncodeType = 'uint8' | 'uint32' | 'uint64' | 'int32' | 'float32' | 'float64';
type NumericArray = { [key: number]: number, length: number };

export type Arg<T> = T extends any[] ? T : [T];

export interface IEncodable<Context = any[]> {
    encode(encoder: IEncoder, ...context: Arg<Context>): any;
}

export enum Relaxations {
    /** Write numbers with compression algorithms */
    Canonical = 'canonical',
    /** Write numbers as full size */
    Full      = 'full',
    /** Write numbers as their original size */
    None      = 'none',
}
export type RelaxationKeys = keyof typeof Relaxations;
export type Relaxation = Relaxations | RelaxationKeys;

export interface IEncoder {
    relaxation: Relaxation;
    get size(): number;
    uint8(value: number): this;
    uint32(value: number, relaxed?: Relaxation): this;
    uint64(value: number | bigint, relaxed?: Relaxation): this;
    uint64(hi: number, lo: number, relaxed?: Relaxation): this;
    int32(value: number, relaxed?: Relaxation): this;
    int64(value: number | bigint, relaxed?: Relaxation): this;
    int64(hi: number, lo: number, relaxed?: Relaxation): this;
    float32(value: number, relaxed?: Relaxation): this;
    float64(value: number, relaxed?: Relaxation): this;
    vector(value: IEncodable[]): this;
    vector<C extends any[] = []>(value: IEncodable<C>[], ...context: C): this;
    vector(value: string, type?: 'utf8'): this;
    vector(value: string[], type?: 'utf8'): this;
    vector(value: number[], type: 'uint64'): this;
    vector(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    vector(value: number[], type: EncodeType, ...args: any[]): this;
    array(value: IEncodable[]): this;
    array<C extends any[] = []>(value: IEncodable<C>[], ...context: C): this;
    array(value: string, type?: 'utf8'): this;
    array(value: string[], type?: 'utf8'): this;
    array(value: number[], type: 'uint64'): this;
    array(value: number[], type: 'uint32', relaxed?: Relaxation): this;
    array(value: number[], type: EncodeType, ...args: any[]): this;
    string(value: string): this;
    utf8(value: string): this;
    encode(value: IEncodable): this;
    encode<C extends any[] = []>(value: IEncodable<C>, ...context: C): this;
    append(data: IEncoder | NumericArray): this;
    spawn(): IEncoder;
    getBuffer(): Uint8Array;
} 
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

export class Encoder implements IEncoder {
    private _data: number[] = [];

    public get size(): number { return this._data.length; }
    public relaxation: Relaxation = Relaxations.Canonical;

    public getBuffer(): Uint8Array { return new Uint8Array(this._data); }
    
    public uint8(value: number): this { this._data.push(value & 0xff); return this; }
    public uint32(value: number, relaxed?: Relaxation): this {
        switch (relaxed || this.relaxation) {
            case Relaxations.Full:
                this._data.push(
                     value         & 0xff,
                    (value >>>  8) & 0xff,
                    (value >>> 16) & 0xff,
                    (value >>> 24) & 0xff
                );
                break;
            case Relaxations.None:
                this._data.push(
                    ( value         & 0x7f) | 0x80,
                    ((value >>>  7) & 0x7f) | 0x80,
                    ((value >>> 14) & 0x7f) | 0x80,
                    ((value >>> 21) & 0x7f) | 0x80,
                    ((value >>> 28) & 0xff)
                )
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

export interface IDecodable<T, Context = any[]> {
    decode(decoder: IDecoder, ...args: Arg<Context>): T;
}

export interface IDecoder {
    get size(): number;
    get remaining(): number;
    get offset(): number;
    relaxation: Relaxation;
    peek(): number;
    uint8(): number;
    uint32(relaxed?: Relaxation): number;
    uint64(relaxed?: Relaxation): number;
    int32(relaxed?: Relaxation): number;
    float32(relaxed?: Relaxation): number;
    float64(relaxed?: Relaxation): number;
    vector<T>(value: IDecodable<T>): T[];
    vector<T, Args extends any[]>(value: IDecodable<T, Args>, ...args: Args): T[];
    vector(type: 'utf8'): string;
    vector(type: EncodeType): number[];
    array<T>(value: IDecodable<T>, length: number): T[];
    array<T, Args extends any[]>(value: IDecodable<T, Args>, length: number, ...args: Args): T[];
    array(type: 'utf8', length: number): string;
    array(type: EncodeType, length: number): number[];
    string(length: number): string;
    utf8(length: number): string;
    decode<T, Args extends any[]>(value: IDecodable<T, Args>, ...args: Args): T;
    read(length: number): Uint8Array;
    slice(length: number): IDecoder;
}
export type IDecoderCtor = new() => IDecoder;

function dec_u_leb128(decoder: IDecoder, maxBitSize?: number): number {
    maxBitSize = maxBitSize || Infinity;
    let result = 0, shift = 0, byte, i = 0;
    while (true) {
        byte = decoder.uint8();
        result |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) { return result; }
        shift += 7;
        if ((i += 7) > maxBitSize) { throw new Error('Unsigned Int to decode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
    }
}
function dec_s_leb128(decoder: IDecoder, maxBitSize?: number): number {
    maxBitSize = maxBitSize || Infinity;
    let result = 0, shift = 0, byte;
    while(true) {
        byte = decoder.uint8();
        result |= (byte & 0x7f) << shift;
        shift += 7;
        if (shift >= maxBitSize) { throw new Error('Signed Int to decode (LEB128) is bigger than expected (' + maxBitSize + ')'); }
        if (!(byte & 0x80)) { return result | ((byte & 0x40) ? (-1 << shift) : 0x0); }
    }
}

export class Decoder implements IDecoder {
    private _view: DataView;
    private _offset: number;
    public get size(): number { return this._view.byteLength; }
    public get remaining(): number { return this._view.byteLength - this._offset; }
    public get offset(): number { return this._offset; }
    public relaxation: Relaxation = Relaxations.Canonical;
    public constructor(buffer: ArrayBuffer, offset?: number, bytes?: number) { this._view = new DataView(buffer, offset, bytes); this._offset = 0; }

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
    public float32(): number { return this._view.getFloat32(this._advance(4)); }
    public float64(): number { return this._view.getFloat64(this._advance(8)); }
    
    public vector<T>(value: IDecodable<T>): T[];
    public vector<T, Args extends any[]>(value: IDecodable<T, Args>, ...args: Args): T[];
    public vector(type: 'utf8'): string;
    public vector(type: EncodeType): number[];
    public vector<T>(type: IDecodable<T> | 'utf8' | EncodeType, ...args: any[]): string | number[] | T[] {
        let length = this.uint32();
        return this.array(type as IDecodable<T>, length, ...args);
    }
    public array<T>(value: IDecodable<T>, length: number): T[];
    public array<T, Args = any[]>(value: IDecodable<T, Args>, length: number, ...args: Arg<Args>): T[];
    public array(type: 'utf8', length: number): string;
    public array(type: EncodeType, length: number): number[];
    public array<T, Args = any[]>(type: IDecodable<T, Args> | 'utf8' | EncodeType, length: number, ...args: Arg<Args>): string | number[] | T[] {
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
    public decode<T, Args = any[]>(value: IDecodable<T, Args>, ...args: Arg<Args>): T {
        return value.decode(this, ...args);
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