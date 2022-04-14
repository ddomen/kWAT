import { protect } from '../internal';
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
    public readonly Parameters!: ResultType;
    /** The list of results types returned by the function.
     * These will be pushed into the stack after the execution of the function,
     * following the exact given order.
    */
    public readonly Results!: ResultType;

    /**
     * Creates a description of a function
     * @param {ResultType} params the array of parameters required
     * @param {ResultType} results the array of results of the function
     */
    public constructor(params: ResultType = [], results: ResultType = []) {
        protect(this, 'Parameters', params.slice(), true);
        protect(this, 'Results', results.slice(), true);
    }

    public encode(encoder: IEncoder): void {
        encoder
            .uint8(Type.func)
            .vector(this.Parameters, 'uint8')
            .vector(this.Results, 'uint8')
        ;
    }

    /** Check wether two function types describes
     * the same function signature.
     * @param {*} other the object to be checked
     * @return {boolean} wether or not the two objects describe the same signature
    */
    public equals(other: any): boolean {
        return this === other || (
                other instanceof FunctionType && 
                this.Parameters.length == other.Parameters.length &&
                this.Parameters.every((p, i) => p === other.Parameters[i]) &&
                this.Results.length == other.Results.length &&
                this.Results.every((r, i) => r === other.Results[i])
        );
    }

    /** Deep copy the current object
     * @return {FunctionType} the deep copy of the function signature
     */
    public clone(): FunctionType { return new FunctionType(this.Parameters, this.Results); }

    /** Decodes a function type from a decoder
     * @param {IDecoder} decoder the target decoder
     * @returns {FunctionType} the read function type
     */
    public static decode(decoder: IDecoder): FunctionType {
        if (decoder.uint8() != Type.func) { throw new Error('Invalid func type'); }
        return new FunctionType(
            decoder.vector('uint8'),
            decoder.vector('uint8')
        )
    }
}