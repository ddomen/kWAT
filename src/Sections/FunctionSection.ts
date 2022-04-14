import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import * as Types from '../Types';
import type { Module } from '../Module';
import type { IEncoder, IDecoder } from '../Encoding';

/** A section containing all the function definitions of the module */
export class FunctionSection extends Section<SectionTypes.function> {

    public readonly Functions!: Types.FunctionType[];

    public constructor() {
        super(SectionTypes.function);
        protect(this, 'Functions', [], true);
    }

    /** Retrieve the indices of the types which describe the 
     * function signatures contained in this section.
     * @param {Module} mod the module containing the type section
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @returns {number[]} the corrispondent indices
     */
    public getIndices(mod: Module, pass?: boolean): number[] {
        let indices = this.Functions.map(f => mod.TypeSection.indexOf(f));
        let wrong: number | undefined;
        if (!pass && indices.some(i => (wrong = i, i < 0))) {
            throw new Error('Invalid function definition index (at: ' + wrong + ')');
        }
        return indices;
    }

    /** Retrieve the index of a function present in this section
     * by checking the signature equality
     * @param {Types.FunctionType} fn the function to search
     * @returns {number} the index of the function, `-1` if not found
     */
    public indexOf(fn: Types.FunctionType): number { return this.Functions.findIndex(f => f.equals(fn)); }
    
    /** Add a new function to this section if not already present
     * @param {Types.FunctionType} type the type to add
     * @returns {boolean} success of the insertion
     */
    public add(fn: Types.FunctionType): boolean {
        if (this.Functions.indexOf(fn) === -1) { this.Functions.push(fn); return true; }
        return false;
    }

    /** Add a new function to this section if not already present
     * @param {Types.FunctionType} type the type to add
     * @returns {boolean} success of the insertion
     */
    public import(fn: Types.FunctionType): boolean {
        return this.add(fn);
    }

    protected override contentEncode(encoder: IEncoder, mod: Module): void {
        let idxs = this.getIndices(mod);
        if (!idxs.length) { return; }
        encoder.vector(idxs, 'uint32');
    }

    public override decode(decoder: IDecoder, mod: Module) {
        let idxs = decoder.vector('uint32'), wrong;
        if (idxs.some(id => (wrong = id, !mod.TypeSection.Types[id]))) {
            throw new Error('Invalid index in type section: ' + wrong)
        }
        this.Functions.length = 0;
        this.Functions.push(...idxs.map(id => mod.TypeSection.Types[id]!.clone()));
    }
}