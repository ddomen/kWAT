import { protect } from './internal';
import { BuildingCallback, ModuleBuilder } from './Builder';
import { IEncoder ,IDecoder, IEncodable, Relaxations } from './Encoding';
import * as Sections from './Sections';

const ModuleMagic = 0x6d736100;

const DefaultOptions: WasmOptions = {
    extendedLEB128: false,
    debugNames: true,
    customSections: true,

    exceptions: false,
    mutableGlobals: true,
    saturateFloatToInt: false,
    signExtension: false,
    SIMD: true,
    threads: false,
    multiValue: false,
    tailCall: false,
    bulkMemory: false,
    referenceTypes: false,

    multipleMemory: false,
    multipleTables: false
};

/** Options for the Wasm v1 (and extensions) byte encoding */
export type WasmOptions = {
    /** Write all LEB128 sizes as 5-bytes instead of their compressed size */
    extendedLEB128: boolean,
    /** Consider/ignore name custom section (ignored if customSections is false) */
    debugNames: boolean,
    /** Consider/ignore any custom section  (overriddes debugName) */
    customSections: boolean,
    
    /** Experimental exception handling
     * @todo
    */
    exceptions: boolean,
    /** Import/export mutable globals handling
     * @todo
     * */
    mutableGlobals: boolean,
    /** Include saturating float-to-int instructions
     * @todo
    */
    saturateFloatToInt: boolean,
    /** Include sign extensions instructions
     * @todo
    */
    signExtension: boolean,
    /** Include SIMD instructions (Single Instruction Multiple Data)
     * @todo
    */
    SIMD: boolean,
    /** Experimental threading supports
     * @todo
    */
    threads: boolean,
    /** Multiple values support
     * @todo
    */
    multiValue: boolean,
    /** Tail call optimization support
     * @todo
    */
    tailCall: boolean,
    /** Include bulk memory instructions
     * @todo
    */
    bulkMemory: boolean,
    /** Include reference type
     * @todo
    */
    referenceTypes: boolean,
    
    /** Allow definition of multiple tables */
    multipleTables: boolean,
    /** Allow definition of multiple memories */
    multipleMemory: boolean
}

export class Module implements IEncodable<WasmOptions> {

    /** The version used for this Wasm module (v1 default) */
    public Version: number;

    /** The type section of the module.
     * Declares a table of type indexes and their declarations.
     * @readonly
     * @see {@link Sections.TypeSection}
    */
    public readonly TypeSection!: Sections.TypeSection;
    /** The function section of the module.
     * Declares a table of function index and their respective type.
     * @readonly
     * @see {@link Sections.FunctionSection}
    */
    public readonly FunctionSection!: Sections.FunctionSection;
    /** The table section of the module.
     * Contains the module table declarations.
     * @readonly
     * @see {@link Sections.TableSection}
    */
    public readonly TableSection!: Sections.TableSection;
    /** The memory section of the module.
     * Contains the module memory declarations.
     * @readonly
     * @see {@link Sections.MemorySection}
    */
    public readonly MemorySection!: Sections.MemorySection;
    /** The global section of the module.
     * Contains mutable and unmutable global variable descriptions.
     * @readonly
     * @see {@link Sections.GlobalSection}
    */
    public readonly GlobalSection!: Sections.GlobalSection;
    /** The element section of the module.
     * Contains the data that initialize the module tables.
     * @readonly
     * @see {@link Sections.ElementSection}
    */
    public readonly ElementSection!: Sections.ElementSection;
    /** The data section of the module.
     * Contains the data that initialize the module memories.
     * @readonly
     * @see {@link Sections.DataSection}
    */
    public readonly DataSection!: Sections.DataSection;
    /** The start section of the module
     * Describes the start function executed when the module loads.
     * @readonly
     * @see {@link Sections.StartSection}
    */
    public readonly StartSection!: Sections.StartSection;
    /** The import section of the module
     * Contains a map of imported types and their names.
     * @readonly
     * @see {@link Sections.ImportSection}
    */
    public readonly ImportSection!: Sections.ImportSection;
    /** The export section of the module.
     * Contains a map of exported types and their names.
     * @readonly
     * @see {@link Sections.ExportSection}
    */
    public readonly ExportSection!: Sections.ExportSection;
    /** The data count section of the module.
     * Describes the length of the data section,
     * will be automatically calculated.
     * @readonly
     * @see {@link Sections.DataCountSection}
    */
    public readonly DataCountSection!: Sections.DataCountSection;
    /** The type section of the module.
     * Contains the body of the declared functions.
     * @readonly
     * @see {@link Sections.CodeSection}
    */
    public readonly CodeSection!: Sections.CodeSection;
    /** The custom sections of the module.
     * Is an array of the custom sections
     * (eg. debug names, source maps, etc)
     * @readonly
     * @see {@link Sections.CustomSection}
    */
    public readonly CustomSections!: Sections.CustomSection[];

    /** An array of all the sections of this module
     * sorted by precedence as described by the standards.
     * The order will also be the order in the physical memory.
    */
    public get Sections(): Sections.Section[] {
        return [
            this.TypeSection,
            this.FunctionSection,
            this.TableSection,
            this.MemorySection,
            this.GlobalSection,
            this.ElementSection,
            this.DataCountSection,
            this.DataSection,
            this.StartSection,
            this.ImportSection,
            this.ExportSection,
            this.CodeSection,
            ...this.CustomSections,
        ].sort((s1, s2) => s1.precedence - s2.precedence);
    }

    /**
     * Create an empty module
     * @param {number} [version=1] the Wasm version used
     */
    constructor(version: number = 1) {
        this.Version = version;
        protect(this, 'TypeSection', new Sections.TypeSection(), true);
        protect(this, 'FunctionSection', new Sections.FunctionSection(), true);
        protect(this, 'TableSection', new Sections.TableSection(), true);
        protect(this, 'MemorySection', new Sections.MemorySection(), true);
        protect(this, 'GlobalSection', new Sections.GlobalSection(), true);
        protect(this, 'ElementSection', new Sections.ElementSection(), true);
        protect(this, 'StartSection', new Sections.StartSection(), true);
        protect(this, 'ImportSection', new Sections.ImportSection(), true);
        protect(this, 'ExportSection', new Sections.ExportSection(), true);
        protect(this, 'DataSection', new Sections.DataSection(), true);
        protect(this, 'DataCountSection', new Sections.DataCountSection(), true);
        protect(this, 'CodeSection', new Sections.CodeSection(), true);
        protect(this, 'CustomSections', [], true);
    }

    /** Set the current module Wasm version.
     * 
     * Actually Wasm runtimes expect the version to be equal to `1.0.0.0` (or `0x00000001`)
     * @param {number} major major version `(x._._._)`
     * @param {number} minor minor version `(_.x._._)`
     * @param {number} patch patch version `(_._.x._)`
     * @param {number} build build version `(_._._.x)`
     * @returns {this} the module itself (chainable method)
     */
    public SetVersion(major: number, minor: number=0, patch: number=0, build: number=0): this {
        this.Version =  (major & 0xff) |
                        ((minor & 0xff) << 8) |
                        ((patch & 0xff) << 16) |
                        ((build & 0xff) << 24);
        return this;
    }

    /** Encode this module through an encoder
     * @param {IEncoder} encoder the encoder target of the writing
     * @param {WasmOptions} [options] the options used to write the module to the encoder
     * @return nothing
     */
    public encode(encoder: IEncoder, options?: Partial<WasmOptions>): void {
        options = Object.assign({}, DefaultOptions, options)
        const e = encoder.spawn();
        e.relaxation = options.extendedLEB128 ? Relaxations.Full : Relaxations.Canonical;
        let sects = this.Sections;
        if (!options.debugNames) { sects = sects.filter(s => !(s instanceof Sections.CustomSections.NameCustomSection)); }
        if (!options.customSections) { sects = sects.filter(s => !(s instanceof Sections.CustomSection)); }
        e
            .uint32(ModuleMagic, Relaxations.None)
            .uint32(this.Version, Relaxations.None)
            .array(sects, this, options as WasmOptions)
        ;
        encoder.append(e);
    }

    /** Reads and decodes a module from a decoder
     * @param {IDecoder} decoder the target decoder
     * @return the read module
    */
    public static decode(decoder: IDecoder): Module {
        if (decoder.uint32(Relaxations.None) !== ModuleMagic) {
            throw new Error('Invalid Module Magic');
        }
        let m = new Module();
        m.Version = decoder.uint32(Relaxations.None);
        let type: number, size, precedence = 0, slice,
            sections: IDecoder[] = [];
        while (decoder.remaining) {
            type = decoder.uint8();
            if (!(type in Sections.SectionTypes)) { throw new Error('Invalid Section type: ' + type); }
            size = decoder.uint32();
            slice = decoder.slice(size);
            if (type === Sections.SectionTypes.custom) {
                m.CustomSections.push(Sections.CustomSection.decode(slice).after(precedence));
            }
            else if (sections[type]) { throw new Error('Duplicated Section type: ' + type); }
            else {
                precedence = type;
                sections[type] = slice;
            }
        }
        let section, modSects = m.Sections;
        for (let i in sections) {
            section = modSects.find(s => s.Type == parseInt(i));
            if (!section) { throw new Error('Module Section not found: ' + i); }
            section.decode(sections[i]!, m);
        }
        return m;
    }

    /** Create a builder that make it easy to fill the current module
     * @param {BuildingCallback<ModuleBuilder>} builder
     *      a callback describing the steps of the module building
     * @return the built module
    */
    public static build(builder: BuildingCallback<ModuleBuilder>): Module {
        return builder(new ModuleBuilder()).build();
    }
    
    /** The magic string at the start of the module physical representation (currently '\0asm') */
    public static get Magic(): typeof ModuleMagic { return ModuleMagic; }
    /** The default options passed to a module encoding */
    public static get DefaultOptions(): typeof DefaultOptions {
        return Object.assign({}, DefaultOptions);
    }
}