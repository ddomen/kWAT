/*
 * Copyright (C) 2022 Daniele Domenichelli
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
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the table definitions of the module */
export class TableSection extends Section<SectionTypes.table> {
    /** The defined table descriptions */
    public readonly Tables!: Types.TableType[];

    /** Create a new empty table section */
    public constructor() {
        super(SectionTypes.table);
        protect(this, 'Tables', [], true);
    }

    /** Add a new table description to this section if not already present
     * @param {Types.TableType} table the table description to add
     * @returns {boolean} success of the insertion
     */
    public add(table: Types.TableType): boolean {
        if (this.Tables.indexOf(table) == -1){
            this.Tables.unshift(table);
            return true;
        }
        return false;
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.Tables.length) { return; }
        if (!opts.multipleTables) {
            let tabs = this.Tables;
            tabs.push(
                ...mod.ImportSection.Imports
                    .map(i => i.isTable() ? i.Description : null!)
                    .filter(x => !!x)    
            );
            if (tabs.length > 1) { throw new Error('Multiple table declaration detected'); }
        }
        encoder.vector(this.Tables);
    }

    public override decode(decoder: IDecoder) {
        this.Tables.length = 0;
        this.Tables.push(...decoder.vector(Types.TableType));
    }
}