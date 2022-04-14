import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { Module } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing information about the start function of the module.
 * A start function will be called as soon as the module is initialized.
 */
 export class StartSection extends Section<SectionTypes.start> {
    /** The function targetted to be the start function.
     * If null this section wil be ignored during the encoding
     */
    public Target: Types.FunctionType | null;

    /** Create a new empty start section */
    constructor() {
        super(SectionTypes.start);
        this.Target = null;
    }

    /** Retrieve the type index of the start function
     * from the module.
     * @param {Module} mod the module containing the type section
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @returns {number} the index of the start function, `-1` if not found
     */
    public getStartIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.Target) { throw new Error('Invalid starting function index'); }
        if (!this.Target) { return -1; }
        let index = mod.TypeSection.indexOf(this.Target);
        if (!pass && index < 0) { throw new Error('Invalid starting function index'); }
        return index;
    }

    public override contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Target) { return; }
        encoder.uint32(this.getStartIndex(mod));
    }
    public override decode(decoder: IDecoder, mod: Module) {
        let index = decoder.uint32();
        if (!mod.TypeSection.Types[index]) {
            throw new Error('Start Section invalid function reference');
        }
        this.Target = mod.TypeSection.Types[index]!;
    }
}