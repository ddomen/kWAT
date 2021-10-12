import { protect } from '../internal';
import { IEncoder, IDecoder, IEncodable } from './Encoder';

export enum Types {
    const               = 0x00,
    limits_min          = 0x00,
    limits_min_max      = 0x01,
    var                 = 0x01,
    i32                 = 0x7f,
    i64                 = 0x7e,
    f32                 = 0x7d,
    f64                 = 0x7c,
    func                = 0x60,
    funcref             = 0x70,
    externref           = 0x6f,
}

export type NumberType = Types.i32 | Types.i64 | Types.f32 | Types.f64;
export type ReferenceType = Types.funcref | Types.externref;
export type ValueType = NumberType | ReferenceType;
export type ResultType = ValueType[];

export class FunctionType implements IEncodable {
    public readonly Parameters!: ResultType;
    public readonly Results!: ResultType;

    public constructor(params: ResultType = [], results: ResultType = []) {
        protect(this, 'Parameters', params.slice(), true);
        protect(this, 'Results', results.slice(), true);
    }

    public encode(encoder: IEncoder): void {
        encoder
            .uint8(Types.func)
            .vector(this.Parameters, 'uint8')
            .vector(this.Results, 'uint8')
        ;
    }

    public equals(other: FunctionType): boolean {
        return this.Parameters.length == other.Parameters.length &&
                this.Parameters.every((p, i) => p === other.Parameters[i]) &&
                this.Results.length == other.Results.length &&
                this.Results.every((r, i) => r === other.Results[i]);
    }

    public clone(): FunctionType { return new FunctionType(this.Parameters, this.Results); }

    public static decode(decoder: IDecoder): FunctionType {
        if (decoder.uint8() != Types.func) { throw new Error('Invalid func type'); }
        return new FunctionType(
            decoder.vector('uint8'),
            decoder.vector('uint8')
        )
    }
}

export class LimitType implements IEncodable {
    public Min: number;
    public Max: number | undefined;

    public constructor(min: number = 0, max?: number) {
        this.Min = min;
        this.Max = max;
    }

    public encode(encoder: IEncoder): void {
        if (typeof(this.Max) !== 'undefined') {
            encoder.uint8(0x01).uint32(this.Min).uint32(this.Max);
        }
        else {
            encoder.uint8(0x00).uint32(this.Min);
        }
    }

    public static decode(decoder: IDecoder): LimitType {
        let hasMax = decoder.uint8();
        return new LimitType(
            decoder.uint32(),
            hasMax ? decoder.uint32() : undefined
        );
    }
}
export type MemoryType = LimitType;

export class TableType implements IEncodable {
    public Reference: ReferenceType;
    public readonly Limits!: LimitType;

    public constructor(reference: ReferenceType, min: number = 0, max?: number) {
        this.Reference = reference;
        protect(this, 'Limits', new LimitType(min, max), true);
    }

    public encode(encoder: IEncoder): void {
        encoder.uint8(this.Reference).encode(this.Limits);
    }

    public static decode(decoder: IDecoder): TableType {
        let ref = decoder.uint8();
        let limit = LimitType.decode(decoder);
        return new TableType(ref, limit.Min, limit.Max);
    }
}

export type MutableType = Types.const | Types.var;

export class GlobalType implements IEncodable {
    public Constant: boolean;
    public Type: ValueType;
    public size(): number { return 2; }

    public constructor(type: ValueType, constant: boolean = false) {
        this.Type = type;
        this.Constant = !!constant;
    }

    public encode(encoder: IEncoder): void {
        encoder.uint8(this.Constant ? 0 : 1).uint8(this.Type);
    }

    public static decode(decoder: IDecoder): GlobalType {
        let isConstant = decoder.uint8();
        return new GlobalType(
            decoder.uint8(),
            !isConstant
        );
    }
}

export type ExternalTypes = Types.func | TableType | MemoryType | GlobalType;

export type IBinaryType = Types | FunctionType | LimitType | TableType | GlobalType;