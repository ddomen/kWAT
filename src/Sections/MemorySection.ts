import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the memory definitions of the module */
export class MemorySection extends Section<SectionTypes.memory> {
    /** The defined memory descriptions */
    public readonly Memories!: Types.MemoryType[];

    /** Create a new empty memory section */
    public constructor() {
        super(SectionTypes.memory);
        protect(this, 'Memories', [], true);
    }
    
    /** Add a new memory description to this section if not already present
     * @param {Types.MemoryType} memory the memory description to add
     * @returns {boolean} success of the insertion
     */
    public add(memory: Types.MemoryType): boolean {
        if (this.Memories.indexOf(memory) == -1) {
            this.Memories.unshift(memory);
            return true;
        }
        return false;
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.Memories.length) { return; }
        if (!opts.multipleMemory) {
            let mem = this.Memories;
            mem.push(
                ...mod.ImportSection.Imports
                    .map(i => i.isMemory() ? i.Description : null!)
                    .filter(x => !!x)
            );
            if (mem.length > 1) { throw new Error('Multiple memory declaration detected'); }
        }
        encoder.vector(this.Memories);
    }

    public override decode(decoder: IDecoder) {
        this.Memories.length = 0;
        this.Memories.push(...decoder.vector(Types.MemoryType));
    }
}