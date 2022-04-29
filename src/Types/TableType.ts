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

import { LimitType } from './LimitType';
import { protect } from '../internal';
import type { ReferenceType } from './Type';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';


/** An object describing a table format.
 * A table contains a size limit and the Wasm type it references.
 */
 export class TableType implements IEncodable {
    /** The type of the elements contained by the table */
    public Reference: ReferenceType;
    /** The size limits of the table */
    public readonly Limits!: LimitType;

    /** Create a new table description
     * @param {ReferenceType} reference the type of the elements of the table
     * @param {number} [min=0] the minimal size of the table in elements
     * @param {(number|undefined)} [max=undefined]
     *  the maximal size of the table in elements (undefined for unlimited) 
     */
    public constructor(reference: ReferenceType, min: number = 0, max?: number) {
        this.Reference = reference;
        protect(this, 'Limits', new LimitType(min, max), true);
    }

    /** Deep copy the current object
     * @return {TableType} the deep copy of the table definition
     */
    public clone(): TableType {
        return new TableType(this.Reference, this.Limits.Min, this.Limits.Max);
    }

    public encode(encoder: IEncoder): void {
        encoder.uint8(this.Reference).encode(this.Limits);
    }

    /** Check whether a value represents the same table definition 
     * @param {*} other the value to be checked
     * @returns {boolean} whether the other value represents the same table definition
     */
    public equals(other: any): boolean {
        return this === other || (
                other instanceof TableType &&
                this.Reference === other.Reference &&
                this.Limits.equals(other.Limits)
        );
    }

    /** Read a table definition from a decoder 
     * @param {IDecoder} decoder the target decoder
     * @returns {TableType} the read table definition
     */
    public static decode(decoder: IDecoder): TableType {
        let ref = decoder.uint8();
        let limit = LimitType.decode(decoder);
        return new TableType(ref, limit.Min, limit.Max);
    }
}
