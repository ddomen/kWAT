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

import { Section, SectionTypes } from './Section';
import type { Module } from '../Module';
import type { IEncoder } from '../Encoding';

/** A section containing the lenght of the data section.
 * It will be automatically computed during the encoding.
 */
export class DataCountSection extends Section<SectionTypes.dataCount> {

    /** Create an empty data count section */
    public constructor() { super(SectionTypes.dataCount); }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!mod.dataSection.segments.length) { return; }
        encoder.uint32(mod.dataSection.segments.length);
    }
    public override decode(): void { }
}