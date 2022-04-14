import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import { UnkownCustomSection } from './CustomSections/UnknownCustomSection';
import type { IEncoder, IDecoder } from '../Encoding';

type CustomSectionCtor = { new(name: string): CustomSection };
export abstract class CustomSection extends Section<SectionTypes.custom> {
    public readonly Name!: string;

    public override set precedence(value: number) { this._precedence = value; }

    protected constructor(name?: string, readonly: boolean=true) {
        super(SectionTypes.custom);
        if (readonly) { protect(this, 'Name', (name || '') + '', true); }
        else { this.Name = name || ''; }
    }

    public after(type: SectionTypes | Section<any>): this {
        return this.like(type, 0.1);
    }
    public before(type: SectionTypes | Section<any>): this {
        return this.like(type, -0.1);
    }
    public like(type: SectionTypes | Section<any>, offset: number = 0): this {
        if (typeof(type) === 'number') {
            if (type === SectionTypes.data) { type = SectionTypes.dataCount; }
            else if (type === SectionTypes.dataCount) { type = SectionTypes.dataCount; }
            this._precedence = type + offset;
        }
        else { this._precedence = type.precedence + offset; }
        return this;
    }

    protected contentEncode(encoder: IEncoder): void {
        if (typeof(this.Name) !== 'string' || !this.Name) { throw new Error('Invalid Custom Section name: \'' + this.Name + '\'')}
        encoder.vector(this.Name);
        this.encodeBytes(encoder);
    }
        
    public decode(decoder: IDecoder): void {
        this.decodeBytes(decoder);
    }
    
    protected abstract encodeBytes(encoder: IEncoder): void;
    protected abstract decodeBytes(decoder: IDecoder): void;

    public static decode(decoder: IDecoder): CustomSection {
        let name = decoder.vector('utf8');
        let type =  CustomSection._customTypes[('' + name).toLowerCase()];
        if (type) { return new type(name); }
        return new UnkownCustomSection(name);
    }

    private static readonly _customTypes: { [key: string]: CustomSectionCtor } = { };

    public static registerCustomType(this: CustomSectionCtor, name: string): void;
    public static registerCustomType(this: typeof CustomSection, name: string, type: CustomSectionCtor): void;
    public static registerCustomType(name: string, type?: CustomSectionCtor): void {
        if (this === CustomSection && !type) { throw new TypeError('Missing second argument (type)'); }
        CustomSection._customTypes[(''+ name).toLowerCase()] = (type || this) as any;
    }
}