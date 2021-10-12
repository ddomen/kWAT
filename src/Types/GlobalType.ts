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
import type { ValueType } from './Type';
import type { WasmOptions } from '../Module';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** Represents a description of a type for a global variable */
export class GlobalType implements IEncodable<WasmOptions> {
    /** whether the global variable is mutable or not */
    public constant: boolean;
    /** The type of the global variable */
    public type: ValueType;

    /** Create a new global variable type definition 
     * @param {ValueType} type the type of the global variable
     * @param {boolean} [constant=false] the mutability of the global variable
     */
    public constructor(type: ValueType, constant: boolean = false) {
        this.type = type;
        this.constant = !!constant;
    }

    /** Deep copy the current object
     * @return {GlobalType} the deep copy of the global variable type definition
     */
    public clone(): GlobalType { return new GlobalType(this.type, this.constant); }

    /** Check if a given value describes the same
     * global type declaration of this object
     * @param {*} other the value to check againts
     * @returns {boolean}
     *  whether the other value represents the same global type declaration
     */
    public equals(other: any): boolean {
        return this === other || (
                other instanceof GlobalType &&
                this.constant === other.constant &&
                this.type === other.type
        );
    }

    public encode(encoder: IEncoder, opts: WasmOptions): void {
        if (!opts.mutableGlobals && !this.constant) {
            throw new KWatError('Mutable global detected');
        }
        encoder.uint8(this.constant ? 0 : 1).uint8(this.type);
    }

    /** Read a global type declaration from a dedcoder 
     * @param {IDecoder} decoder the target decoder
     * @returns {GlobalType} the read global variable type declaration
     */
    public static decode(decoder: IDecoder): GlobalType {
        let isConstant = decoder.uint8();
        return new GlobalType(
            decoder.uint8(),
            !isConstant
        );
    }
}