import { protect } from '../internal';
import { Expression } from '../Instructions';
import { Section, SectionTypes } from './Section';
import type { Module } from '../Module';
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
export class DataSegment implements IEncodable<Module> {
    /** The mode of the segment */
    public Mode: DataMode;
    /** The memory referenced where to store the data.
     * If null the memory is automatically selected
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1).
     */
    public Memory: MemoryType | null;
    /** The initialization expression, if present.
     * An active memory must be initialized with an expression.
     */
    public Expression: Expression | null;
    /** The initialization byte data */
    public readonly Bytes!: number[];

    /** True if the current segment is has the {@link DataMode.active} mode  */
    public get isActive(): boolean { return !(this.Mode & 0x01); }
    /** True if the current segment is has the {@link DataMode.activeExplicit} mode  */
    public get isExplicit(): boolean { return !!(this.Mode & 0x02); }

    /** Create a new empty data segment with the given mode */
    constructor(kind: DataMode) {
        this.Mode = kind;
        this.Memory = null;
        this.Expression = null;
        protect(this, 'Bytes', [], true);
    }

    /** Retrieve the memory index where the data will be
     * stored once the module is loaded.
     * @param {Module} mod the module holding the memory section
     * @param {boolean} [pass] don't throw exceptions if the operation fails
     * @return {number} the index of the accessed memory
     */
    public getMemoryIndex(mod: Module, pass?: boolean): number {
        if (this.Mode !== DataMode.activeExplicit) {
            if (!pass && this.Memory) {
                throw new Error('Non-explicit data mode can not have an explicit memory reference');
            }
            return this.Memory ?
                    mod.MemorySection.Memories[0] === this.Memory ? 0 : -1 :
                    0;
        }
        if (!this.Memory) {
            if (!pass && !mod.MemorySection.Memories.length) {
                throw new Error('Default memory not yet instanciated in the current module');
            }
            return 0;
        }
        let idx = mod.MemorySection.Memories.indexOf(this.Memory);
        if (!pass && idx < 0) { throw new Error('Invalid DataSegment Memory reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, mod: Module): void {
        if (this.Mode < 0 || this.Mode > DataMode.activeExplicit) {
            throw new Error('Invalid DataSegment kind: ' + this.Mode);
        }
        let idx;
        if (!this.Bytes) { throw new Error('Invalid DataSegment: missing data')}
        encoder.uint8(this.Mode);
        switch (this.Mode) {
            case DataMode.active:
                if (!this.Expression) { throw new Error('Invalid DataSegment[Active]'); }
                encoder.encode(this.Expression, mod);
                break;
            case DataMode.activeExplicit:
                if (!this.Memory || !this.Expression) { throw new Error('Invalid DataSegment[ActiveExplicit]'); }
                idx = this.getMemoryIndex(mod)
                encoder.uint32(idx).encode(this.Expression, mod);
                break;
            case DataMode.passive: break;
            default: throw new Error('Invalid DataSegment kind: ' + this.Mode);
        }
        encoder.append(this.Bytes);
    }

    public static decode(decoder: IDecoder, mod: Module): DataSegment {
        let kind = decoder.uint8();
        let segment = new DataSegment(kind);
        switch (kind) {
            case DataMode.active:
                segment.Expression = decoder.decode(Expression, mod);
                break;
            case DataMode.passive: break;
            case DataMode.activeExplicit: {
                let idx = decoder.uint32();
                if (!mod.MemorySection.Memories[idx]) {
                    throw new Error('Invalid Data Segment memory reference');
                }
                segment.Memory = mod.MemorySection.Memories[idx]!;
                segment.Expression = decoder.decode(Expression, mod);
                break;
            }
            default: throw new Error('Invalid DataSegment kind: ' + kind);
        }
        segment.Bytes.push(...decoder.read(decoder.remaining));
        return segment;
    }
}

/** A section containing the all the data definitions.
 * It is usually used to initialize memory or tables.
 */
export class DataSection extends Section<SectionTypes.data> {
    /** All the data segment present in this section */
    public readonly Datas!: DataSegment[];

    /** Create an empty data section */
    public constructor() {
        super(SectionTypes.data);
        protect(this, 'Datas', [], true);
    }

    /** Add a new data segment, if not already present.
     * @param {DataSegment} segment the segment to be added
     * @return {boolean} the success of the operation
     */
    public add(segment: DataSegment): boolean { 
        if (this.Datas.indexOf(segment) === -1) {
            this.Datas.push(segment);
            return true;
        }
        return false;
    }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Datas.length) { return; }
        encoder.vector(this.Datas, mod);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.Datas.length = 0;
        this.Datas.push(...decoder.vector(DataSegment, mod));
    }
}