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
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the memory definitions of the module */
export class MemorySection extends Section<SectionTypes.memory> {
    /** The defined memory descriptions */
    public readonly memories!: Types.MemoryType[];

    /** Create a new empty memory section */
    public constructor() {
        super(SectionTypes.memory);
        protect(this, 'memories', [], true);
    }
    
    /** Add a new memory description to this section if not already present
     * @param {Types.MemoryType} memory the memory description to add
     * @returns {boolean} success of the insertion
     */
    public add(memory: Types.MemoryType): boolean {
        if (this.memories.indexOf(memory) == -1) {
            this.memories.unshift(memory);
            return true;
        }
        return false;
    }
    
    /** Retrieve the index of a memory present in this section
     * @param {Types.MemoryType} memory the memory to search
     * @returns {number} the index of the variable, `-1` if not found
     */
    public indexOf(memory: Types.MemoryType): number {
        return this.memories.indexOf(memory);
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.memories.length) { return; }
        if (!opts.multipleMemory) {
            let mem = this.memories;
            mem.push(
                ...mod.importSection.imports
                    .map(i => i.isMemory() ? i.description : null!)
                    .filter(x => !!x)
            );
            if (mem.length > 1) { throw new KWatError('Multiple memory declaration detected'); }
        }
        encoder.vector(this.memories);
    }

    public override decode(decoder: IDecoder) {
        this.memories.length = 0;
        this.memories.push(...decoder.vector(Types.MemoryType));
    }
}