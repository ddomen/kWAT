import { protect } from '../internal';
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder, IEncodable, IDecodable } from '../Encoding';

/** Enumeration of all types described
 * by the Wasm standard and their section code
*/
export enum SectionTypes {
    /** {@link CustomSection} */
    custom           = 0x0,
    /** {@link TypeSection} */
    type             = 0x1,
    /** {@link ImportSection} */
    import           = 0x2,
    /** {@link FunctionSection} */
    function         = 0x3,
    /** {@link TableSection} */
    table            = 0x4,
    /** {@link MemorySection} */
    memory           = 0x5,
    /** {@link GlobalSection} */
    global           = 0x6,
    /** {@link ExportSection} */
    export           = 0x7,
    /** {@link StartSection} */
    start            = 0x8,
    /** {@link ElementSection} */
    element          = 0x9,
    /** {@link CodeSection} */
    code             = 0xa,
    /** {@link DataSection} */
    data             = 0xb,
    /** {@link DataCountSection} */
    dataCount        = 0xc,
}

/** An abstract class defining the common behaviours of a section,
 * their precedence and how they encode to a buffer.
 */
export abstract class Section<S extends SectionTypes=SectionTypes>
    implements IEncodable<[Module, WasmOptions]>, IDecodable<void> {

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