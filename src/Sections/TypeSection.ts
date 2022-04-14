import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the type definitions of the module */
export class TypeSection extends Section<SectionTypes.type> {

    public readonly Types!: Types.FunctionType[];

    /** Creates an empty type section */
    public constructor() {
        super(SectionTypes.type);
        protect(this, 'Types', [], true);
    }

    /** Retrieve the index of a type present in this section
     * by checking the signature equality
     * @param {Types.FunctionType} type the type to search
     * @returns {number} the index of the type, `-1` if not found
     */
    public indexOf(type: Types.FunctionType): number {
        return this.Types.findIndex(f => f.equals(type));
    }
    /** Add a new type to this section if not already present
     * (by checking the signature)
     * @param {Types.FunctionType} type the type to add
     * @returns {boolean} success of the insertion
     */
    public add(type: Types.FunctionType): boolean {
        if (!this.Types.some(t => t.equals(type))) {
            this.Types.push(type.clone())
            return true;
        }
        return false;
    }

    /** Add a new type to this section if not already present
     * (by checking the signature)
     * @param {Types.FunctionType} type the type to add
     * @returns {boolean} success of the insertion
     */
    public import(type: Types.FunctionType): boolean {
        return this.add(type);
    }

    protected override contentEncode(encoder: IEncoder): void {
        if (!this.Types.length) { return; }
        encoder.vector(this.Types);
    }

    public decode(decoder: IDecoder): void {
        this.Types.length = 0;
        this.Types.push(...decoder.vector(Types.FunctionType));
    }
    
}