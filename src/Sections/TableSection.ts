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

/** A section containing all the table definitions of the module */
export class TableSection extends Section<SectionTypes.table> {
    /** The defined table descriptions */
    public readonly tables!: Types.TableType[];

    /** Create a new empty table section */
    public constructor() {
        super(SectionTypes.table);
        protect(this, 'tables', [], true);
    }

    /** Add a new table description to this section if not already present
     * @param {Types.TableType} table the table description to add
     * @returns {boolean} success of the insertion
     */
    public add(table: Types.TableType): boolean {
        if (this.tables.indexOf(table) == -1){
            this.tables.unshift(table);
            return true;
        }
        return false;
    }

    /** Retrieve the index of a memory present in this section
     * @param {Types.MemoryType} memory the memory to search
     * @returns {number} the index of the variable, `-1` if not found
     */
    public indexOf(table: Types.TableType): number {
        return this.tables.indexOf(table);
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.tables.length) { return; }
        if (!opts.multipleTables) {
            let tabs = this.tables;
            tabs.push(
                ...mod.importSection.imports
                    .map(i => i.isTable() ? i.description : null!)
                    .filter(x => !!x)    
            );
            if (tabs.length > 1) { throw new KWatError('Multiple table declaration detected'); }
        }
        encoder.vector(this.tables);
    }

    public override decode(decoder: IDecoder) {
        this.tables.length = 0;
        this.tables.push(...decoder.vector(Types.TableType));
    }
}