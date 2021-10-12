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

import { protect } from '../internal';
import { KWatError } from '../errors';
import { Type, ResultType } from './Type';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** Describes a type of a function in Wasm module.
 * It classify the signature of the function, mapping a 
 * vector of parameters into a vector of results,
 * describing inputs and outputs of the function.
 */
 export class FunctionType implements IEncodable {
    /** The list of paramaters types used by the function.
     * These will be asked to be into the stack during the execution of the function,
     * following the exact given order.
    */
    public readonly parameters!: ResultType;
    /** The list of results types returned by the function.
     * These will be pushed into the stack after the execution of the function,
     * following the exact given order.
    */
    public readonly results!: ResultType;

    /**
     * Creates a description of a function
     * @param {ResultType} params the array of parameters required
     * @param {ResultType} results the array of results of the function
     */
    public constructor(params: ResultType = [], results: ResultType = []) {
        protect(this, 'parameters', params.slice(), true);
        protect(this, 'results', results.slice(), true);
    }

    public encode(encoder: IEncoder): void {
        encoder
            .uint8(Type.func)
            .vector(this.parameters, 'uint8')
            .vector(this.results, 'uint8')
        ;
    }

    /** Check whether two function types describes
     * the same function signature.
     * @param {*} other the object to be checked
     * @return {boolean} whether or not the two objects describe the same signature
    */
    public equals(other: any): boolean {
        return this === other || (
                other instanceof FunctionType && 
                this.parameters.length == other.parameters.length &&
                this.parameters.every((p, i) => p === other.parameters[i]) &&
                this.results.length == other.results.length &&
                this.results.every((r, i) => r === other.results[i])
        );
    }

    /** Deep copy the current object
     * @return {FunctionType} the deep copy of the function signature
     */
    public clone(): FunctionType { return new FunctionType(this.parameters, this.results); }

    /** Decodes a function type from a decoder
     * @param {IDecoder} decoder the target decoder
     * @returns {FunctionType} the read function type
     */
    public static decode(decoder: IDecoder): FunctionType {
        if (decoder.uint8() != Type.func) { throw new KWatError('Invalid func type'); }
        return new FunctionType(
            decoder.vector('uint8'),
            decoder.vector('uint8')
        )
    }
}