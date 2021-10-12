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
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { Module } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing information about the start function of the module.
 * A start function will be called as soon as the module is initialized.
 */
 export class StartSection extends Section<SectionTypes.start> {
    /** The function targetted to be the start function.
     * If null this section wil be ignored during the encoding
     */
    public target: Types.FunctionType | null;

    /** Create a new empty start section */
    constructor() {
        super(SectionTypes.start);
        this.target = null;
    }

    /** Retrieve the type index of the start function
     * from the module.
     * @param {Module} mod the module containing the type section
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @returns {number} the index of the start function, `-1` if not found
     */
    public getStartIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.target) { throw new KWatError('Invalid starting function index'); }
        if (!this.target) { return -1; }
        let index = mod.indexOf(this.target);
        if (!pass && index < 0) { throw new KWatError('Invalid starting function index'); }
        return index;
    }

    public override contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.target) { return; }
        encoder.uint32(this.getStartIndex(mod));
    }
    public override decode(decoder: IDecoder, mod: Module) {
        let index = decoder.uint32();
        if (!mod.typeSection.types[index]) {
            throw new KWatError('Start Section invalid function reference');
        }
        this.target = mod.typeSection.types[index]!;
    }
}