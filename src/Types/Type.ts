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

import type { TableType } from './TableType';
import type { GlobalType } from './GlobalType';
import type { FunctionType } from './FunctionType';
import type { LimitType, MemoryType } from './LimitType';

/** Enumeration of Wasm available types and constants */
export enum Type {
    /** Void type (used for describe empty result blocks) */
    void                = 0x40,
    /** Function descriptor type */
    func                = 0x60,

    /** 32 bit integer (the sign is determined by individual operations) */
    i32                 = 0x7f,
    /** 64 bit integer (the sign is determined by individual operations) */
    i64                 = 0x7e,
    /** 32 bit floating point (IEEE 754-2019 standards) */
    f32                 = 0x7d,
    /** 64 bit floating point (IEEE 754-2019 standards) */
    f64                 = 0x7c,

    /** Reference (pointer) to a function (regardless of the type)
     * 
     * *Reference types are opaque, meaning that neither their size nor their bit pattern can be observed.*
    */
    funcref             = 0x70,
    /** Reference (pointer) to an external object
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
export type BlockType = ValueType | Type.void;

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
export type BlockTypeKey = TypesKey<BlockType>;

/** Collection of all numeric type ({@link NumberType}) */
export const NumberTypeValues: NumberType[] = [ Type.i32, Type.i64, Type.f32, Type.f64 ];
/** Collection of all reference type ({@link ReferenceType}) */
export const ReferenceTypeValues: ReferenceType[] = [ Type.funcref, Type.externref ];
/** Collection of all value type ({@link ValueType}) */
export const ValueTypeValues: ValueType[] = [ ...NumberTypeValues, ...ReferenceTypeValues ];
/** Collection of all global variable mutability ({@link MutableType}) */
export const BlockTypeValues: BlockType[] = [ ...NumberTypeValues, Type.void ];

/** Collection of all numeric type keys ({@link NumberType}) */
export const NumberTypeKeys = NumberTypeValues.map(v => Type[v]! as NumberTypeKey);
/** Collection of all reference type keys ({@link ReferenceType}) */
export const ReferenceTypeKeys = ReferenceTypeValues.map(v => Type[v]! as ReferenceTypeKey);
/** Collection of all value type keys ({@link ValueType}) */
export const ValueTypeKeys = ValueTypeValues.map(v => Type[v]! as ValueTypeKey);
/** Collection of all global variable mutability keys ({@link MutableType}) */
export const BlockTypeKeys = BlockTypeValues.map(v => Type[v]! as BlockTypeKey);

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
export function validBlock(target: any): target is BlockType { return typeof(target) === 'number' && BlockTypeValues.indexOf(target) >= 0; }

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
export function validBlockKey(target: string): target is BlockTypeKey { return typeof(target) === 'string' && BlockTypeKeys.indexOf(target as any) >= 0; }


/** Types that can be imported/exported by a module */
export type ExternalTypes = Type.func | TableType | MemoryType | GlobalType;
/** Types which can be expressed in a binary form */
export type IBinaryType = Type | FunctionType | LimitType | TableType | GlobalType;