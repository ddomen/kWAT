const zeros = '0000000000000000000000000000000000000000000000000000000000000000';

type EncodeType = 'uint8' | 'uint32' | 'uint64' | 'int32' | 'float32' | 'float64';
type NumericArray = { [key: number]: number, length: number };

export interface IEncodable<C = undefined> {
    encode(encoder: IEncoder, context: C): any;
}

export interface IEncoder {
    get size(): number;
    uint8(value: number): this;
    uint32(value: number, relaxed?: boolean): this;
    uint64(value: number, relaxed?: boolean): this;
    uint64(hi: number, lo: number, relaxed?: boolean): this;
    int32(value: number, relaxed?: boolean): this;
    float32(value: number, relaxed?: boolean): this;
    float64(value: number, relaxed?: boolean): this;
    vector(value: IEncodable<undefined>[]): this;
    vector<C>(value: IEncodable<C>[], context: C): this;
    vector(value: string, type?: 'utf8'): this;
    vector(value: string[], type?: 'utf8'): this;
    vector(value: number[], type: 'uint64'): this;
    vector(value: number[], type: 'uint32', relaxed?: boolean): this;
    vector(value: number[], type: EncodeType, ...args: any[]): this;
    array(value: IEncodable<undefined>[]): this;
    array<C>(value: IEncodable<C>[], context: C): this;
    array(value: string, type?: 'utf8'): this;
    array(value: string[], type?: 'utf8'): this;
    array(value: number[], type: 'uint64'): this;
    array(value: number[], type: 'uint32', relaxed?: boolean): this;
    array(value: number[], type: EncodeType, ...args: any[]): this;
    string(value: string): this;
    utf8(value: string): this;
    encode(value: IEncodable<undefined>): this;
    encode<C>(value: IEncodable<C>, context: C): this;
    append(data: IEncoder | NumericArray): this;
    spawn(): IEncoder;
    getBuffer(): Uint8Array;
}
export type IEncoderCtor = new() => IEncoder;


export class Encoder implements IEncoder {
    private _data: number[] = [];

    public get size(): number { return this._data.length; }

    public getBuffer(): Uint8Array { return new Uint8Array(this._data); }
    
    public uint8(value: number): this { this._data.push(value & 0xff); return this; }
    public uint32(value: number, relaxed?: boolean): this {
        if (relaxed) {
            this._data.push(
                value          & 0xff,
                (value >>>  8) & 0xff,
                (value >>> 16) & 0xff,
                (value >>> 24) & 0xff
            )
        }
        else {
            let byte;
            do {
                byte = value & 0x7f;
                value >>= 7;
                if (value !== 0) { value |= 0x80; }
                this._data.push(byte);
            }
            while (value !== 0);
        }
        return this;
    }
    public uint64(value: number): this;
    public uint64(hi: number, lo: number): this;
    public uint64(hi: number, lo?: number): this {
        if (typeof(lo) === 'undefined') {
            let s = hi.toString(2);
            s = zeros.substring(s.length) + s;
            hi = parseInt(s.substring(0, 32), 2);
            lo = parseInt(s.substring(32), 2);
        }

        this._data.push(
            lo          & 0xff,
            (lo >>>  8) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>> 24) & 0xff,
            hi          & 0xff,
            (hi >>>  8) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>> 24) & 0xff
        )

        return this;
    }

    public int32(value: number): this {
        value |= 0;
        let byte;
        while (true) {
            byte = value & 0x7f;
            value >>= 7;
            if (
                (value ===  0 && (byte & 0x40) === 0) ||
                (value === -1 && (byte & 0x40) !== 0)
            ) {
                this._data.push(byte);
                return this;
            }
            this._data.push(byte | 0x80);
        }
    }
    public float32(value: number): this {
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

                var exponent = Math.floor(Math.log(value) / Math.log(2));
                var significand = ((value / Math.pow(2, exponent)) * 0x00800000) | 0;

                exponent += 127;
                if (exponent >= 0xFF) {
                    exponent = 0xFF;
                    significand = 0;
                } else if (exponent < 0) exponent = 0;

                bytes = bytes | (exponent << 23);
                bytes = bytes | (significand & ~(-1 << 23));
            break;
        }
        return this.uint32(bytes, true);
    }
    public float64(value: number): this {
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

                var exponent = Math.floor(Math.log(value) / Math.log(2));
                var significand = Math.floor((value / Math.pow(2, exponent)) * Math.pow(2, 52));

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

        return this.uint64(hi, lo);
    }

    public vector(value: IEncodable<undefined>[]): this;
    public vector<C>(value: IEncodable<C>[], context: C): this;
    public vector(value: string, type?: 'utf8'): this;
    public vector(value: string[], type?: 'utf8'): this;
    public vector(value: number[], type: 'uint64'): this;
    public vector(value: number[], type: 'uint32', relaxed?: boolean): this;
    public vector(value: number[], type: EncodeType, ...args: any[]): this;
    public vector(value: string | string[] | number[] | IEncodable[], type?: EncodeType | 'utf8', ...args: any[]): this {
        this.uint32(value.length);
        return this.array(value as any, type as any, ...args);
    }

    public array(value: IEncodable<undefined>[]): this;
    public array<C>(value: IEncodable<C>[], context: C): this;
    public array(value: string, type?: 'utf8'): this;
    public array(value: string[], type?: 'utf8'): this;
    public array(value: number[], type: 'uint64'): this;
    public array(value: number[], type: 'uint32', relaxed?: boolean): this;
    public array(value: number[], type: EncodeType, ...args: any[]): this;
    public array(value: string | string[] | number[] | IEncodable[], type?: EncodeType | 'utf8', ...args: any[]): this {
        if (!value.length) { return this; }
        if (typeof(value) === 'string') { return this.utf8(value); }
        let ftype = typeof(value[0]);
        if (ftype === 'object') {
            if (value.some(v => typeof(v) !== 'object' || typeof(v.encode) != 'function')) {
                throw new Error('Unable to encode non-numeric/non-string/non-compilable/mixed vector');
            }
            value.forEach(v => this.encode(v as IEncodable, type as any));
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

    public encode(value: IEncodable<undefined>): this;
    public encode<C>(value: IEncodable<C>, context: C): this;
    public encode(value: IEncodable, context?: any): this {
        value.encode(this, context);
        return this;
    }

    public append(data: IEncoder | NumericArray): this {
        if ('getBuffer' in data) { data = data.getBuffer(); }
        for (let k = 0; k < data.length; ++k) { this._data.push((data[k] || 0) & 0xff); }
        return this;
    }

    public spawn(): IEncoder { return new Encoder(); }
}

export interface IDecodable<T, Args extends any[]=[]> {
    decode(decoder: IDecoder, ...args: Args): T;
}

export interface IDecoder {
    get size(): number;
    get remaining(): number;
    get offset(): number;
    peek(): number;
    uint8(): number;
    uint32(relaxed?: boolean): number;
    uint64(relaxed?: boolean): number;
    int32(relaxed?: boolean): number;
    float32(relaxed?: boolean): number;
    float64(relaxed?: boolean): number;
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

export class Decoder implements IDecoder {
    private _view: DataView;
    private _offset: number;
    public get size(): number { return this._view.byteLength; }
    public get remaining(): number { return this._view.byteLength - this._offset; }
    public get offset(): number { return this._offset; }
    public constructor(buffer: ArrayBuffer, offset?: number, bytes?: number) { this._view = new DataView(buffer, offset, bytes); this._offset = 0; }

    private _advance(amount: number): number {
        let o = this._offset;
        this._offset += amount;
        return o;
    }

    public peek(): number { return this._view.getUint8(this._offset); }

    public uint8(): number { return this._view.getUint8(this._offset++); }
    public uint32(relaxed?: boolean): number {
        if (relaxed) { return this._view.getUint32(this._advance(4), true); }
        let data = Array.from(this.read(4)), result = 0, shift = 0, byte;
        while (true) {
            byte = data.shift() || 0;
            result |= (byte & 0x7f) << shift;
            if (!(byte & 0x80)) { this._offset -= data.length; return result; }
            shift += 7;
        }
    }
    public uint64(relaxed?: boolean): number {
        if (relaxed) { 
            let lo = this._view.getUint32(this._advance(4), true).toString(2);
            let hi = this._view.getUint32(this._advance(4), true).toString(2);
            return parseInt(zeros.slice(hi.length) + hi + zeros.slice(lo.length) + lo, 2);
        }
        let data = Array.from(this.read(8)), result = 0, shift = 0, byte;
        while (true) {
            byte = data.shift() || 0;
            result |= (byte & 0x7f) << shift;
            if (!(byte & 0x80)) { this._offset -= data.length; return result; }
            shift += 7;
        }
    }
    public int32(relaxed?: boolean): number {
        if (relaxed) { return this._view.getInt32(this._advance(4), true); }
        let data = Array.from(this.read(4)), result = 0, shift = 0, byte;
        while (true) {
            byte = data.shift() || 0;
            result |= (byte & 0x7f) << shift;
            shift += 7;
            if (!(byte & 0x80)) {
                this._offset -= data.length;
                if (shift < 32 && (byte & 0x40) !== 0) {
                    return result | (~0 << shift);
                }
                return result;
            }
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
    public array<T, Args extends any[]>(value: IDecodable<T, Args>, length: number, ...args: Args): T[];
    public array(type: 'utf8', length: number): string;
    public array(type: EncodeType, length: number): number[];
    public array<T, Args extends any[]>(type: IDecodable<T, Args> | 'utf8' | EncodeType, length: number, ...args: Args): string | number[] | T[] {
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
    public decode<T, Args extends any[]>(value: IDecodable<T, Args>, ...args:Args): T {
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