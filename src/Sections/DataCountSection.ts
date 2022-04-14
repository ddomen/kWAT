import { Section, SectionTypes } from './Section';
import type { Module } from '../Module';
import type { IEncoder } from '../Encoding';

/** A section containing the lenght of the data section.
 * It will be automatically computed during the encoding.
 */
export class DataCountSection extends Section<SectionTypes.dataCount> {

    /** Create an empty data count section */
    public constructor() { super(SectionTypes.dataCount); }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!mod.DataSection.Datas.length) { return; }
        encoder.uint32(mod.DataSection.Datas.length);
    }
    public override decode(): void { }
}