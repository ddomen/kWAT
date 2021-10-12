import { protect } from '../internal';
import { BuildingCallback, FunctionBuilder } from './Builder';
import * as Sections from './Sections';
import type { IEncoder ,IDecoder, IEncodable } from './Encoder';

const ModuleMagic = 0x6d736100;

export class Module implements IEncodable {

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

    public encode(encoder: IEncoder): void {
        encoder
            .uint32(ModuleMagic, true)
            .uint32(this.Version, true)
            .array(this.Sections, this)
        ;
    }

    public defineFunction(fn: BuildingCallback<FunctionBuilder>): this {
        let def = fn(new FunctionBuilder()).build();
        if (def.export) {
            if (!this.ExportSection.add(def.export)) {
                throw new Error('Exported function name already defined');
            }
        }
        this.TypeSection.add(def.segment.Signature);
        this.FunctionSection.add(def.segment.Signature);
        this.CodeSection.add(def.segment);
        return this;
    }

    public static decode(decoder: IDecoder): Module {
        if (decoder.uint32(true) !== ModuleMagic) {
            throw new Error('Invalid Module Magic');
        }
        let m = new Module();
        m.Version = decoder.uint32(true);
        let type: number, size, precedence = 0, slice,
            sections: IDecoder[] = [];
        while (decoder.remaining) {
            type = decoder.uint8();
            if (!(type in Sections.SectionTypes)) { throw new Error('Invalid Section type: ' + type); }
            size = decoder.uint32();
            slice = decoder.slice(size);
            if (type === Sections.SectionTypes.custom) {
                let custom = new Sections.CustomSection();
                custom.after(precedence).decode(slice);
                m.CustomSections.push(custom);
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

    public static readonly Magic: typeof ModuleMagic = ModuleMagic;
}