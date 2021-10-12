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
import { Expression } from '../Instructions';
import { Section, SectionTypes } from './Section';
import type { Module, WasmOptions } from '../Module';
import type { MemoryType } from '../Types';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** Mode for a data segment */
export enum DataMode {
    /** An active data segment copies its contents
     * into a memory during instantiation,
     * as specified by a memory index and
     * a constant expression defining an offset
     * into that memory
    */
    active          = 0x00,
    /** A passive data segment’s contents
     * can be copied into a memory
     * using the [OpCodesExt1.memory_init](../../OpCodes.ts)
     * instruction
     */
    passive         = 0x01,
    /** Same as {@link active} but makes it explicit
     * the memory index to reference
     */
    activeExplicit  = 0x02
}

/** An object which contains information about
 * a data component initialization
 */
export class DataSegment implements IEncodable<[Module, WasmOptions]> {
    /** The mode of the segment */
    public mode: DataMode;
    /** The memory referenced where to store the data.
     * If null the memory is automatically selected
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1).
     */
    public memory: MemoryType | null;
    /** The initialization expression, if present.
     * An active memory must be initialized with an expression.
     */
    public expression: Expression | null;
    /** The initialization byte data */
    public readonly bytes!: number[];

    /** True if the current segment is has the {@link DataMode.active} mode  */
    public get isActive(): boolean { return !(this.mode & 0x01); }
    /** True if the current segment is has the {@link DataMode.activeExplicit} mode  */
    public get isExplicit(): boolean { return !!(this.mode & 0x02); }

    /** Create a new empty data segment with the given mode */
    constructor(kind: DataMode) {
        this.mode = kind;
        this.memory = null;
        this.expression = null;
        protect(this, 'bytes', [], true);
    }

    /** Retrieve the memory index where the data will be
     * stored once the module is loaded.
     * @param {Module} mod the module holding the memory section
     * @param {boolean} [pass] don't throw exceptions if the operation fails
     * @return {number} the index of the accessed memory
     */
    public getMemoryIndex(mod: Module, pass?: boolean): number {
        if (this.mode !== DataMode.activeExplicit) {
            if (!pass && this.memory) {
                throw new KWatError('Non-explicit data mode can not have an explicit memory reference');
            }
            return this.memory ?
                    mod.memorySection.memories[0] === this.memory ? 0 : -1 :
                    0;
        }
        if (!this.memory) {
            if (!pass && !mod.memorySection.memories.length) {
                throw new KWatError('Default memory not yet instanciated in the current module');
            }
            return 0;
        }
        let idx = mod.memorySection.memories.indexOf(this.memory);
        if (!pass && idx < 0) { throw new KWatError('Invalid DataSegment Memory reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (this.mode < 0 || this.mode > DataMode.activeExplicit) {
            throw new KWatError('Invalid DataSegment kind: ' + this.mode);
        }
        let idx;
        if (!this.bytes) { throw new KWatError('Invalid DataSegment: missing data')}
        encoder.uint8(this.mode);
        switch (this.mode) {
            case DataMode.active:
                if (!this.expression) { throw new KWatError('Invalid DataSegment[Active]'); }
                encoder.encode(this.expression, mod, opts);
                break;
            case DataMode.activeExplicit:
                if (!this.memory || !this.expression) { throw new KWatError('Invalid DataSegment[ActiveExplicit]'); }
                idx = this.getMemoryIndex(mod)
                encoder.uint32(idx).encode(this.expression, mod, opts);
                break;
            case DataMode.passive: break;
            default: throw new KWatError('Invalid DataSegment kind: ' + this.mode);
        }
        encoder.append(this.bytes);
    }

    public static decode(decoder: IDecoder, mod: Module): DataSegment {
        let kind = decoder.uint8();
        let segment = new DataSegment(kind);
        switch (kind) {
            case DataMode.active:
                segment.expression = decoder.decode(Expression, mod);
                break;
            case DataMode.passive: break;
            case DataMode.activeExplicit: {
                let idx = decoder.uint32();
                if (!mod.memorySection.memories[idx]) {
                    throw new KWatError('Invalid Data Segment memory reference');
                }
                segment.memory = mod.memorySection.memories[idx]!;
                segment.expression = decoder.decode(Expression, mod);
                break;
            }
            default: throw new KWatError('Invalid DataSegment kind: ' + kind);
        }
        segment.bytes.push(...decoder.vector('uint8'));
        return segment;
    }
}

/** A section containing the all the data definitions.
 * It is usually used to initialize memory or tables.
 */
export class DataSection extends Section<SectionTypes.data> {
    /** All the data segment present in this section */
    public readonly segments!: DataSegment[];

    /** Create an empty data section */
    public constructor() {
        super(SectionTypes.data);
        protect(this, 'segments', [], true);
    }

    /** Add a new data segment, if not already present.
     * @param {DataSegment} segment the segment to be added
     * @return {boolean} the success of the operation
     */
    public add(segment: DataSegment): boolean { 
        if (this.segments.indexOf(segment) === -1) {
            this.segments.push(segment);
            return true;
        }
        return false;
    }

    protected contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.segments.length) { return; }
        encoder.vector(this.segments, mod, opts);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.segments.length = 0;
        this.segments.push(...decoder.vector(DataSegment, mod));
    }
}