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
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder, IEncodable, IDecodable } from '../Encoding';

/** Enumeration of all types described
 * by the Wasm standard and their section code
*/
export enum SectionTypes {
    /** {@link CustomSection} */
    custom           = 0x00,
    /** {@link TypeSection} */
    type             = 0x01,
    /** {@link ImportSection} */
    import           = 0x02,
    /** {@link FunctionSection} */
    function         = 0x03,
    /** {@link TableSection} */
    table            = 0x04,
    /** {@link MemorySection} */
    memory           = 0x05,
    /** {@link GlobalSection} */
    global           = 0x06,
    /** {@link ExportSection} */
    export           = 0x07,
    /** {@link StartSection} */
    start            = 0x08,
    /** {@link ElementSection} */
    element          = 0x09,
    /** {@link CodeSection} */
    code             = 0x0a,
    /** {@link DataSection} */
    data             = 0x0b,
    /** {@link DataCountSection} */
    dataCount        = 0x0c
}

/** An abstract class defining the common behaviours of a section,
 * their precedence and how they encode to a buffer.
 */
export abstract class Section<S extends SectionTypes=SectionTypes>
    implements IEncodable<[Module, WasmOptions]>, IDecodable<void, [Module, WasmOptions]> {

    /** The precedence of this section (used in physical encoding) */
    protected _precedence!: number;
    /** The type code of this section
     * @readonly */
    public readonly Type!: S;

    /** The precedence of this section (used in physical encoding) */
    public get precedence(): number { return this._precedence; }

    /** Creates the skeleton of a Module Section
     * @param {S} type the {@link SectionType} code of this section
     */
    protected constructor(type: S) {
        protect(this, 'Type', type, true);
        if (this.Type !== SectionTypes.custom) {
            let prec: SectionTypes = this.Type
            if (prec === SectionTypes.data) { prec = SectionTypes.dataCount; }
            else if (prec === SectionTypes.dataCount) { prec = SectionTypes.data; }
            protect(this, '_precedence' as any, prec, false);
        }
        else { this._precedence = SectionTypes.dataCount + 1; }
    }

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        let content = encoder.spawn();
        this.contentEncode(content, mod, opts);
        if (content.size) { encoder.uint8(this.Type).uint32(content.size).append(content); }
    }

    public abstract decode(decoder: IDecoder, mod: Module): void;

    /** Specifies how the section encodes its content
     * @param {IEncoder} encoder target encoder
     * @param {Module} mod the holder module
     * @param {WasmOptions} opts the Wasm options of the encoding
     */
    protected abstract contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void;
}

/** Enumeration of all possible types
 * exhangable in import/export operations
 */
export enum ExchangeDescriptionCode {
    /** Function exchange subsection */
    function    = 0x00,
    /** Table exchange subsection */
    table       = 0x01,
    /** Memory exchange subsection */
    memory      = 0x02,
    /** Global exchange subsection */
    global      = 0x03
}