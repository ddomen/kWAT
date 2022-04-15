import type { TableType } from './TableType';
import type { GlobalType } from './GlobalType';
import type { FunctionType } from './FunctionType';
import type { LimitType, MemoryType } from './LimitType';

/** Enumeration of Wasm available types and constants */
export enum Type {
    /** Constant (unmutable) global variable */
    const               = 0x00,
    /** The min descriptor of the memory limit */
    limits_min          = 0x00,
    /** The max descriptor of the memory limit */
    limits_min_max      = 0x01,
    /** Variable (mutable) global variable */
    var                 = 0x01,
    /** Type: 32 bit integer (the sign is determined by individual operations) */
    i32                 = 0x7f,
    /** Type: 64 bit integer (the sign is determined by individual operations) */
    i64                 = 0x7e,
    /** Type: 32 bit floating point (IEEE 754-2019 standards) */
    f32                 = 0x7d,
    /** Type: 64 bit floating point (IEEE 754-2019 standards) */
    f64                 = 0x7c,
    /** Constant describing a function */
    func                = 0x60,
    /** Type: reference to a function (regardless of the type)
     * 
     * *Reference types are opaque, meaning that neither their size nor their bit pattern can be observed.*
    */
    funcref             = 0x70,
    /** Type: reference to an external object
     * 
     * *Reference types are opaque, meaning that neither their size nor their bit pattern can be observed.*
    */
    externref           = 0x6f,
}

/** All the numeric types described by Wasm standards */
export type NumberType = Type.i32 | Type.i64 | Type.f32 | Type.f64;
/** All the reference types described by Wasm standards */
export type ReferenceType = Type.funcref | Type.externref;
/** All the possible value types described by Wasm standards */
export type ValueType = NumberType | ReferenceType;
/** The possible types returned by an instruction */
export type ResultType = ValueType[];
/** The kind of a global variable mutability */
export type MutableType = Type.const | Type.var;

/** String keys of the {@link Type} enumeration */
export type TypesKey<T extends Type=Type> = {
    [K in keyof typeof Type]: (typeof Type)[K] extends T ? K : never;
}[keyof typeof Type]
/** The possible types present in the stack */
export type Stack = ResultType;

/** All the keys of the {@link ValueType} */
export type ValueTypeKey = TypesKey<ValueType>;
/** All the keys of the {@link ReferenceType} */
export type ReferenceTypeKey = TypesKey<ReferenceType>;
/** All the keys of the {@link NumberType} */
export type NumberTypeKey = TypesKey<NumberType>;
/** All the keys of the {@link MutableType} */
export type MutableTypeKey = TypesKey<MutableType>;

/** Collection of all numeric type ({@link NumberType}) */
export const NumberTypeValues: NumberType[] = [ Type.i32, Type.i64, Type.f32, Type.f64 ];
/** Collection of all reference type ({@link ReferenceType}) */
export const ReferenceTypeValues: ReferenceType[] = [ Type.funcref, Type.externref ];
/** Collection of all value type ({@link ValueType}) */
export const ValueTypeValues: ValueType[] = [ ...NumberTypeValues, ...ReferenceTypeValues ];
/** Collection of all global variable mutability ({@link MutableType}) */
export const MutableTypeValues: MutableType[] = [ Type.const, Type.var ];

/** Collection of all numeric type keys ({@link NumberType}) */
export const NumberTypeKeys = NumberTypeValues.map(v => Type[v]! as NumberTypeKey);
/** Collection of all reference type keys ({@link ReferenceType}) */
export const ReferenceTypeKeys = ReferenceTypeValues.map(v => Type[v]! as ReferenceTypeKey);
/** Collection of all value type keys ({@link ValueType}) */
export const ValueTypeKeys = ValueTypeValues.map(v => Type[v]! as ValueTypeKey);
/** Collection of all global variable mutability keys ({@link MutableType}) */
export const MutableTypeKeys = MutableTypeValues.map(v => Type[v]! as MutableTypeKey);

/** Check if a value is of {@link NumberType} type
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is of the given type
*/
export function validNumber(target: any): target is NumberType { return typeof(target) === 'number' && NumberTypeValues.indexOf(target) >= 0; }
/** Check if a value is of {@link ReferenceType} type
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is of the given type
*/
export function validReference(target: any): target is ReferenceType { return typeof(target) === 'number' && ReferenceTypeValues.indexOf(target) >= 0; }
/** Check if a value is of {@link ValueType} type
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is of the given type
*/
export function validValue(target: any): target is ValueType { return typeof(target) === 'number' && ValueTypeValues.indexOf(target) >= 0; }
/** Check if a value is of {@link MutableType} kind
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is of the kind
*/
export function validMutable(target: any): target is MutableType { return typeof(target) === 'number' && MutableTypeValues.indexOf(target) >= 0; }

/** Check if a value is of {@link NumberType} keys 
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is a key of the given type
*/
export function validNumberKey(target: string): target is NumberTypeKey { return typeof(target) === 'string' && NumberTypeKeys.indexOf(target as any) >= 0; }
/** Check if a value is of {@link ReferenceType} keys
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is a key of the given type
*/
export function validReferenceKey(target: string): target is ReferenceTypeKey { return typeof(target) === 'string' && ReferenceTypeKeys.indexOf(target as any) >= 0; }
/** Check if a value is of {@link ValueType} keys
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is a key of the given type
*/
export function validValueKey(target: string): target is ValueTypeKey { return typeof(target) === 'string' && ValueTypeKeys.indexOf(target as any) >= 0; }
/** Check if a value is of {@link MutableType} kind keys
 * @param {*} target the value to be checked
 * @return {boolean} whether or not the value is a key of the given kind
*/
export function validMutableKey(target: string): target is MutableTypeKey { return typeof(target) === 'string' && MutableTypeKeys.indexOf(target as any) >= 0; }


/** Types that can be imported/exported by a module */
export type ExternalTypes = Type.func | TableType | MemoryType | GlobalType;
/** Types which can be expressed in a binary form */
export type IBinaryType = Type | FunctionType | LimitType | TableType | GlobalType;