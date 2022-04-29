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
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the type definitions of the module */
export class TypeSection extends Section<SectionTypes.type> {

    public readonly Types!: Types.FunctionType[];

    /** Creates an empty type section */
    public constructor() {
        super(SectionTypes.type);
        protect(this, 'Types', [], true);
    }

    /** Retrieve the index of a type present in this section
     * by checking the signature equality
     * @param {Types.FunctionType} type the type to search
     * @returns {number} the index of the type, `-1` if not found
     */
    public indexOf(type: Types.FunctionType): number {
        return this.Types.findIndex(f => f.equals(type));
    }
    /** Add a new type to this section if not already present
     * (by checking the signature)
     * @param {Types.FunctionType} type the type to add
     * @returns {boolean} success of the insertion
     */
    public add(type: Types.FunctionType): boolean {
        if (!this.Types.some(t => t.equals(type))) {
            this.Types.push(type.clone())
            return true;
        }
        return false;
    }

    protected override contentEncode(encoder: IEncoder): void {
        if (!this.Types.length) { return; }
        encoder.vector(this.Types);
    }

    public decode(decoder: IDecoder): void {
        this.Types.length = 0;
        this.Types.push(...decoder.vector(Types.FunctionType));
    }
    
}