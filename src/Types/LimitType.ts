import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** Describes a tuple of minimum and maximum values.
 * It is usually used to describe the size of a memory or a table.
*/
export class LimitType implements IEncodable {
    /** Minimal value */
    public Min: number;
    /** Maximal value (undedfined for unlimited) */
    public Max: number | undefined;

    /** Build a limit tuple 
     * @param {number} [min=0] minimal value
     * @param {(number|undefined)} [max=undefined] maximal value (undefined for unlimited)
     */
    public constructor(min: number = 0, max?: number) {
        this.Min = min;
        this.Max = max;
    }
    
    /** Deep copy the current object
     * @return {TableType} the deep copy of the limit
     */
    public clone(): LimitType { return new LimitType(this.Min, this.Max); }

    public encode(encoder: IEncoder): void {
        if (typeof(this.Max) !== 'undefined') { encoder.uint8(0x01).uint32(this.Min).uint32(this.Max); }
        else { encoder.uint8(0x00).uint32(this.Min); }
    }

    /** Check wether another value describes the same limit
     * of the current object.
     * @param {*} other the value to be checked
     * @return {boolean} wether two values describe the same limit
     */
    public equals(other: any): boolean {
        return this === other || (
                other instanceof LimitType &&
                this.Max === other.Max &&
                this.Min === other.Min
        );
    }

    /** Read a limit from a dedcoder
     * @param {IDecoder} decoder the target decoder
     * @returns {LimitType} the read limit object
     */
    public static decode(decoder: IDecoder): LimitType {
        let hasMax = decoder.uint8();
        return new LimitType(
            decoder.uint32(),
            hasMax ? decoder.uint32() : undefined
        );
    }
}

/** The type memory described by the Wasm, coincides with a limit type */
export type MemoryType = LimitType;
/** The type memory described by the Wasm, coincides with a limit type */
export const MemoryType = LimitType;