import { protect } from '../internal';
import { BuildingCallback, ModuleBuilder } from './Builder';
import * as Sections from './Sections';
import { IEncoder ,IDecoder, IEncodable, Relaxations } from './Encoder';

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

export type WasmOptions = {
    /** Write all LEB128 sizes as 5-bytes instead of their compressed size */
    extendedLEB128: boolean,
    /** Consider/ignore name custom section (ignored if customSections is false) */
    debugNames: boolean,
    /** Consider/ignore any custom section  (overriddes debugName) */
    customSections: boolean,
    
    /** Experimental exception handling - TODO */
    exceptions: boolean,
    /** Import/export mutable globals handling - TODO */
    mutableGlobals: boolean,
    /** Include saturating float-to-int instructions - TODO */
    saturateFloatToInt: boolean,
    /** Include sign extensions instructions - TODO */
    signExtension: boolean,
    /** Include SIMD instructions (Single Instruction Multiple Data)  */
    SIMD: boolean,
    /** Experimental threading supports - TODO */
    threads: boolean,
    /** Multiple values support - TODO */
    multiValue: boolean,
    /** Tail call optimization support - TODO */
    tailCall: boolean,
    /** Include bulk memory instructions - TODO */
    bulkMemory: boolean,
    /** Include reference type - TODO */
    referenceTypes: boolean,
    
    /** Allow definition of multiple tables */
    multipleTables: boolean,
    /** Allow definition of multiple memories */
    multipleMemory: boolean
}

export class Module implements IEncodable<WasmOptions> {

    public Version: number;

    public readonly TypeSection!: Sections.TypeSection;
    public readonly FunctionSection!: Sections.FunctionSection;
    public readonly TableSection!: Sections.TableSection;
    public readonly MemorySection!: Sections.MemorySection;
    public readonly GlobalSection!: Sections.GlobalSection;
    public readonly ElementSection!: Sections.ElementSection;
    public readonly DataSection!: Sections.DataSection;
    public readonly StartSection!: Sections.StartSection;
    public readonly ImportSection!: Sections.ImportSection;
    public readonly ExportSection!: Sections.ExportSection;
    public readonly DataCountSection!: Sections.DataCountSection;
    public readonly CodeSection!: Sections.CodeSection;
    public readonly CustomSections!: Sections.CustomSection[];

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

    public encode(encoder: IEncoder, options?: Partial<WasmOptions>): void {
        options = Object.assign({}, DefaultOptions, options)
        const e = encoder.spawn();
        e.relaxation = options.extendedLEB128 ? Relaxations.Full : Relaxations.Canonical;
        let sects = this.Sections;
        if (!options.debugNames) { sects = sects.filter(s => !(s instanceof Sections.NameCustomSection)); }
        if (!options.customSections) { sects = sects.filter(s => !(s instanceof Sections.CustomSection)); }
        e
            .uint32(ModuleMagic, Relaxations.None)
            .uint32(this.Version, Relaxations.None)
            .array(sects, this, options as WasmOptions)
        ;
        encoder.append(e);
    }

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

    public static build(builder: BuildingCallback<ModuleBuilder>): Module {
        return builder(new ModuleBuilder()).build();
    }
    
    public static get Magic(): typeof ModuleMagic { return ModuleMagic; }
    public static get DefaultOptions(): typeof DefaultOptions {
        return Object.assign({}, DefaultOptions);
    }
}