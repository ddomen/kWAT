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
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';
import type { FunctionType, ReferenceType, TableType } from '../Types';

/** Enumeration of all possible modes of a table element */
export enum ElementMode {
    /** An active element segment copies its elements
     * into a table during instantiation,
     * as specified by a table index
     * and a constant expression defining
     * an offset into that table
     */
    ActiveKind                  = 0x00,
    /** A declarative element segment is not available
     * at runtime but merely serves to forward-declare
     * references that are formed in code with
     * instructions like [OpCodes.ref_func](../../OpCodes.ts).
     */
    DeclarativeKind             = 0x01,
    /** An active element segment copies its elements
     * into a table during instantiation,
     * as specified by a table index
     * and a constant expression defining
     * an offset into that table
     */
    ActiveKindTable             = 0x02,
    /** A passive element segment’s elements
     * can be copied to a table
     * using the [OpCodesExt1.table_init](../../OpCodes.ts) instruction.
     */
    PassiveKind                 = 0x03,
    /** An active element segment copies its elements
     * into a table during instantiation,
     * as specified by a table index
     * and a constant expression defining
     * an offset into that table
     */
    ActiveType                  = 0x04,
    /** A declarative element segment is not available
     * at runtime but merely serves to forward-declare
     * references that are formed in code with
     * instructions like [OpCodes.ref_func](../../OpCodes.ts).
     */
    DeclarativeType             = 0x05,
    /** An active element segment copies its elements
     * into a table during instantiation,
     * as specified by a table index
     * and a constant expression defining
     * an offset into that table
     */
    ActiveTypeTable             = 0x06,
    /** A passive element segment’s elements
     * can be copied to a table
     * using the [OpCodesExt1.table_init](../../OpCodes.ts) instruction.
     */
    PassiveType                 = 0x07,

    /** Used to get the max value of enumeration */
    MAX = PassiveType
}

/** Enumeration of all possible types of a table element */
export enum ElementKind {
    /** The element holds a function pointer (of any type) */
    funcref     = 0x00
} 

/** A section containing all element definitions for table initialization */
export class ElementSegment implements IEncodable<[Module, WasmOptions]> {
    /** The mode used by the segment */
    public mode: ElementMode;
    /** The kind of stored memory */
    public kind: ElementKind | null;

    /** The target table where to store the element.
     * This is valid only for active segments.
     * @see {@link ElementMode}
     */
    public table: TableType | null;
    /** The (first) element initialization expression
     *```
     * TABLE:
     * elem1 -> expression()
     * ```
    */
    public expression: Expression | null;
    /** The type of the element */
    public reference: ReferenceType | null;
    /** The functions used to copy the pointers into the table.
     * ```
     * TABLE:
     * elem1 -> func1
     * elem2 -> func2
     * ...
     * ```
     */
    public readonly functions!: FunctionType[];
    /** The subsequent elements initialization expressions
     * ```
     * TABLE:
     * elem1 -> expression()
     * elem2 -> init1()
     * elem3 -> init2()
     * ...
     * ```
     */
    public readonly initialization!: Expression[];

    /** Create a new empty element segment */
    public constructor() {
        this.mode = ElementMode.ActiveKind;
        this.kind = null;
        this.table = null;
        this.expression = null;
        this.reference = null;
        protect(this, 'functions', [], true)
        protect(this, 'initialization', [], true)
    }

    /** True if the actual element mode includes an active mode */
    public get isActive(): boolean { return !(this.mode & 0x01); }
    public set isActive(value: boolean) { value ? (this.mode &= 0x06) : (this.mode |= 0x01); }
    
    /** True if the actual element mode includes a passive mode */
    public get isPassive(): boolean { return !!(this.mode & 0x03); }
    public set isPassive(value: boolean) {
        if (value) { this.mode |= 0x03; }
        else if (this.isDeclarative) { this.mode &= 0x05; }
    }

    /** True if the actual element mode includes a declarative mode */
    public get isDeclarative(): boolean { return !!(this.mode & 0x01) && !(this.mode & 0x02); }
    public set isDeclarative(value: boolean) { 
        if (value) { this.mode |= 0x01; this.mode &= 0x05; }
        else if (this.isPassive) { this.mode |= 0x02; }
    }

    /** True if the actual element mode must declare explicitly a table index */
    public get hasExplicitTable(): boolean { return this.isActive && !!(this.mode & 0x02) }
    /** True if the actual element mode uses kind reference */
    public get usesElementKind(): boolean { return !this.usesElementType; }
    /** True if the actual element mode uses type reference */
    public get usesElementType(): boolean { return !!(this.mode & 0x04); }

    /** Retrieve the function indices of the {@link functions} property array
     * by looking at the module type section.
     * @param {Module} mod the module holding the type section
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @return {number[]} the indices of the types relative to the
     *                      used {@link functions}
     */
    public getFunctionIndices(mod: Module, pass?: boolean): number[] {
        let idxs = this.functions.map(f => mod.typeSection.indexOf(f));
        let wrong;
        if (!pass && idxs.some(i => (wrong = i, i < 0))) { throw new KWatError('Invalid function definition index (at: ' + wrong + ')') }
        return idxs;
    }

    /** Retrieve the table indix of the {@link table} property
     * by looking at the module table section.
     * @param {Module} mod the module holding the table section
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @return {number[]} the index of the table or `-1` if not found
     */
    public getTableIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.table) { throw new KWatError('Invalid ElementSegment Table reference'); }
        if (!this.table) { return -1; }
        let idx = mod.tableSection.tables.indexOf(this.table);
        if (!pass && idx < 0) { throw new KWatError('Invalid ElementSegment Table reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (this.mode > ElementMode.MAX || this.mode < 0) {
            throw new KWatError('Invalid Element Segment type [0x00, 0x07]: ' + this.mode);
        }
        encoder.uint8(this.mode);
        let idxs, tid;
        switch (this.mode) {
            case ElementMode.ActiveKind:
                if (!this.expression || !this.functions.length) { throw new KWatError('Invalid ElementSegment[ActiveKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder
                    .encode(this.expression, mod, opts)
                    .vector(idxs, 'uint32');
                break;
            case ElementMode.DeclarativeKind:
                if (this.kind === null || !this.functions.length) { throw new KWatError('Invalid ElementSegment[DeclarativeKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder
                    .uint8(this.kind)
                    .vector(idxs, 'uint32');
                break;
            case ElementMode.ActiveKindTable:
                if (!this.expression || !this.table || this.kind === null || !this.functions.length) { throw new KWatError('Invalid ElementSegment[ActiveKindTable]'); }
                tid = this.getTableIndex(mod)
                idxs = this.getFunctionIndices(mod);
                encoder
                    .uint32(tid)
                    .encode(this.expression, mod, opts)
                    .uint8(this.kind)
                    .vector(idxs, 'uint32')
                ;
                break;
            case ElementMode.PassiveKind:
                if (this.kind === null || !this.functions.length) { throw new KWatError('Invalid ElementSegment[PassiveKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder.uint8(this.kind).vector(idxs, 'uint32');
                break;
            case ElementMode.ActiveType:
                if (!this.expression || !this.initialization.length) { throw new KWatError('Invalid ElementSegment[ActiveType]'); }
                encoder.encode(this.expression, mod, opts)
                        .vector(this.initialization, mod, opts);
                break;
            case ElementMode.DeclarativeType:
                if (!this.reference || !this.initialization.length) { throw new KWatError('Invalid ElementSegment[DeclarativeType]'); }
                encoder.uint8(this.reference)
                        .vector(this.initialization, mod, opts);
                break;
            case ElementMode.ActiveTypeTable:
                if (!this.table || !this.expression || !this.reference || !this.initialization.length) { throw new KWatError('Invalid ElementSegment[ActiveTypeTable]'); }
                tid = this.getTableIndex(mod);
                encoder
                    .uint32(tid)
                    .encode(this.expression, mod, opts)
                    .uint8(this.reference)
                    .vector(this.initialization, mod, opts)
                ;
                break;
            case ElementMode.PassiveType:
                if (!this.reference || !this.initialization.length) { throw new KWatError('Invalid ElementSegment[PassiveType]'); }
                encoder.uint8(this.reference)
                        .vector(this.initialization, mod, opts);
                break;
            default: throw new KWatError('Invalid ElementSegment Type: ' + this.mode)
        }
    }

    /**Decode this object through a decoder
     * @param {IDecodder} decoder the decoder target of the reading
     * @param {Module} mod the module that holdds the sections
     * @return {ElementKind} the read element segment
    */
    public static decode(decoder: IDecoder, mod: Module): ElementSegment {
        let type = decoder.uint8();
        let idxs, tid;
        let segment = new ElementSegment();
        switch (type) {
            case ElementMode.ActiveKind:
                segment.expression = decoder.decode(Expression, mod);
                idxs = decoder.vector('uint32');
                segment.functions.push(...idxs.map(id => mod.functionSection.functions[id]!));
                if (segment.functions.some(f => !f)) {
                    throw new KWatError('Invalid Element Segment function reference');
                }
                break;
            case ElementMode.DeclarativeKind:
                segment.kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.functions.push(...idxs.map(id => mod.functionSection.functions[id]!));
                if (segment.functions.some(f => !f)) {
                    throw new KWatError('Invalid Element Segment function reference');
                }
                break;
            case ElementMode.ActiveKindTable:
                tid = decoder.uint32();
                segment.expression = decoder.decode(Expression, mod);
                segment.kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                if (!mod.tableSection.tables[tid]) {
                    throw new KWatError('Invalid Element Segment table reference');
                }
                segment.table = mod.tableSection.tables[tid]!;
                segment.functions.push(...idxs.map(id => mod.functionSection.functions[id]!));
                if (segment.functions.some(f => !f)) {
                    throw new KWatError('Invalid Element Segment function reference');
                }
                break;
            case ElementMode.PassiveKind:
                segment.kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.functions.push(...idxs.map(id => mod.functionSection.functions[id]!));
                if (segment.functions.some(f => !f)) {
                    throw new KWatError('Invalid Element Segment function reference');
                }
                break;
            case ElementMode.ActiveType:
                segment.expression = decoder.decode(Expression, mod);
                segment.initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementMode.DeclarativeType:
                segment.reference = decoder.uint8();
                segment.initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementMode.ActiveTypeTable:
                tid = decoder.uint32();
                if (!mod.tableSection.tables[tid]) {
                    throw new KWatError('Invalid Element Segment table reference');
                }
                segment.table = mod.tableSection.tables[tid]!;
                segment.expression = decoder.decode(Expression, mod);
                segment.reference = decoder.uint8();
                segment.initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementMode.PassiveType:
                segment.reference = decoder.uint8();
                segment.initialization.push(...decoder.vector(Expression, mod));
                break;
            default: throw new KWatError('Invalid ElementSegment Type: ' + type)
        }
        return segment;
    }
}

/** A section containing all the element definitions and initializations of the module */
export class ElementSection extends Section<SectionTypes.element> {
    /** All the elements defined/initialized in the section */
    public readonly elements!: ElementSegment[];

    /** Create a new empty element section */
    public constructor() {
        super(SectionTypes.element);
        protect(this, 'elements', [], true);
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.elements.length) { return; }
        encoder.vector(this.elements, mod, opts);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.elements.length = 0;
        this.elements.push(...decoder.vector(ElementSegment, mod));
    }
}