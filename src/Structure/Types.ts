import { protect } from '../internal';
import { IEncoder, IDecoder, IEncodable } from './Encoder';

export enum Type {
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

export type NumberType = Type.i32 | Type.i64 | Type.f32 | Type.f64;
export type ReferenceType = Type.funcref | Type.externref;
export type ValueType = NumberType | ReferenceType;
export type ResultType = ValueType[];
export type MutableType = Type.const | Type.var;

export type TypesKey<T extends Type=Type> = {
    [K in keyof typeof Type]: (typeof Type)[K] extends T ? K : never;
}[keyof typeof Type]
export type Stack = [ ResultType, ResultType ];

export type ValueTypeKey = TypesKey<ValueType>;
export type ReferenceTypeKey = TypesKey<ReferenceType>;
export type NumberTypeKey = TypesKey<NumberType>;
export type MutableTypeKey = TypesKey<MutableType>;

export const NumberTypeValues: NumberType[] = [ Type.i32, Type.i64, Type.f32, Type.f64 ];
export const ReferenceTypeValues: ReferenceType[] = [ Type.funcref, Type.externref ];
export const ValueTypeValues: ValueType[] = [ ...NumberTypeValues, ...ReferenceTypeValues ];
export const MutableTypeValues: MutableType[] = [ Type.const, Type.var ];

export const NumberTypeKeys = NumberTypeValues.map(v => Type[v]! as NumberTypeKey);
export const ReferenceTypeKeys = ReferenceTypeValues.map(v => Type[v]! as ReferenceTypeKey);
export const ValueTypeKeys = ValueTypeValues.map(v => Type[v]! as ValueTypeKey);
export const MutableTypeKeys = MutableTypeValues.map(v => Type[v]! as MutableTypeKey);

export function validNumber(target: any): target is NumberType { return typeof(target) === 'number' && NumberTypeValues.indexOf(target) >= 0; }
export function validReference(target: any): target is ReferenceType { return typeof(target) === 'number' && ReferenceTypeValues.indexOf(target) >= 0; }
export function validValue(target: any): target is ValueType { return typeof(target) === 'number' && ValueTypeValues.indexOf(target) >= 0; }
export function validMutable(target: any): target is MutableType { return typeof(target) === 'number' && MutableTypeValues.indexOf(target) >= 0; }

export function validNumberKey(target: string): target is NumberTypeKey { return typeof(target) === 'string' && NumberTypeKeys.indexOf(target as any) >= 0; }
export function validReferenceKey(target: string): target is ReferenceTypeKey { return typeof(target) === 'string' && ReferenceTypeKeys.indexOf(target as any) >= 0; }
export function validValueKey(target: string): target is ValueTypeKey { return typeof(target) === 'string' && ValueTypeKeys.indexOf(target as any) >= 0; }
export function validMutableKey(target: string): target is MutableTypeKey { return typeof(target) === 'string' && MutableTypeKeys.indexOf(target as any) >= 0; }

export class FunctionType implements IEncodable {
    public readonly Parameters!: ResultType;
    public readonly Results!: ResultType;
    public Reference: string;

    public get isReference(): boolean { return !!this.Reference && !this.Parameters.length && !this.Results.length; }

    public constructor(params: ResultType = [], results: ResultType = [], reference?: string) {
        protect(this, 'Parameters', params.slice(), true);
        protect(this, 'Results', results.slice(), true);
        this.Reference = reference || '';
    }

    public encode(encoder: IEncoder): void {
        encoder
            .uint8(Type.func)
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

    public referred(other: FunctionType | string): boolean {
        if (other instanceof FunctionType) { return other.isReference && this.Reference === other.Reference; }
        return this.Reference === other;
    }
    public refer(other: FunctionType | string): boolean {
        return this.isReference && (other instanceof FunctionType ? other.Reference : other) === other;
    }

    public clone(): FunctionType { return new FunctionType(this.Parameters, this.Results); }

    public static decode(decoder: IDecoder): FunctionType {
        if (decoder.uint8() != Type.func) { throw new Error('Invalid func type'); }
        return new FunctionType(
            decoder.vector('uint8'),
            decoder.vector('uint8')
        )
    }

    public static refer(name: string): FunctionType {
        name = '' + name
        if (!name) { throw new Error('Invalid empty name for a function reference'); }
        return new FunctionType([], [], name);
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
        if (typeof(this.Max) !== 'undefined') { encoder.uint8(0x01).uint32(this.Min).uint32(this.Max); }
        else { encoder.uint8(0x00).uint32(this.Min); }
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
export const MemoryType = LimitType;

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

export type ExternalTypes = Type.func | TableType | MemoryType | GlobalType;

export type IBinaryType = Type | FunctionType | LimitType | TableType | GlobalType;