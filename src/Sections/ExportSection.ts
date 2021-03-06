/**
  * @license kwat 0.1.0 Copyright (C) 2022 Daniele Domenichelli
  * 
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  * 
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  * 
  * You should have received a copy of the GNU General Public License
  * along with this program.  If not, see <https://www.gnu.org/licenses/>.
  */

import * as Types from '../Types';
import { protect } from '../internal';
import { KWatError } from '../errors';
import { Section, SectionTypes, ExchangeDescriptionCode } from './Section';
import type { Module } from '../Module';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** Exchange type descriptor for {@link ExportDescription} */
type ExchangeNarrower<R extends ExportDescription> = { description: R };

/** All possible types which are exchangeable in export operations */
export type ExportDescription = Types.FunctionType | Types.TableType | Types.MemoryType | Types.GlobalType;
/** A part of the export section which describe an export operation */
export class ExportSegment implements IEncodable<Module> {
    /** The name of the exported entity */
    public name: string;
    /** A description of the exported entity */
    public description: ExportDescription;

    /** Whether or not the import entity is a function declaration */
    public isFunction(): this is ExchangeNarrower<Types.FunctionType> {
        return this.description instanceof Types.FunctionType;
    }
    /** Whether or not the import entity is a table declaration */
    public isTable(): this is ExchangeNarrower<Types.TableType> {
        return this.description instanceof Types.TableType;
    }
    /** Whether or not the import entity is a memory declaration */
    public isMemory(): this is ExchangeNarrower<Types.MemoryType> {
        return this.description instanceof Types.LimitType;
    }
    /** Whether or not the import entity is a global variable declaration */
    public isGlobal(): this is ExchangeNarrower<Types.GlobalType> {
        return this.description instanceof Types.GlobalType;
    }
    /** The exchange code of the imported entity */
    public get code(): ExchangeDescriptionCode {
        if (this.isTable()) { return ExchangeDescriptionCode.table}
        else if (this.isMemory()) { return ExchangeDescriptionCode.memory; }
        else if (this.isGlobal()) { return ExchangeDescriptionCode.global; }
        else if (this.isFunction()) { return ExchangeDescriptionCode.function; }
        return -1;
    }
    /** Validity flag of the exchange code */
    public get valid(): boolean { return this.code as number !== -1; }

    /** Create a new exported entity definition
     * @param {string} name the name of the exported entity
     * @param {ImportDescription} description the description of the exported entity
     */
    public constructor(name: string, description: ExportDescription) {
        this.name = name;
        this.description = description;
    }
    
    /** Retrieves the index of the exported entity
     * @param {Module} mod the module holding the sections to search
     * @param {boolean} [pass] don't throw exception on operation faliure
     * @returns {number} the index of the exported entity in the relative section,
     *                      `-1` if not found
     */
    public getIndex(mod: Module, pass?: boolean): number {
        if (!this.valid) { throw new KWatError('Invalid Description type'); }
        let index = mod.indexOf(this.description);
        if (!pass && index < 0) { throw new KWatError('Invalid function definition index!') }
        return index;
    }

    public encode(encoder: IEncoder, mod: Module) {
        let code = this.code;
        if (code < 0) { throw new KWatError('Invalid export description!'); }
        let index = this.getIndex(mod);
        encoder
            .vector(this.name)
            .uint8(code)
            .uint32(index);
    }
    
    /**Decode this object through a decoder
     * @param {IDecodder} decoder the decoder target of the reading
     * @param {Module} mod the module that holdds the type section
     * @return {ExportSegment} the read export segment
    */
    public static decode(decoder: IDecoder, mod: Module): ExportSegment {
        let name = decoder.vector('utf8'),
            code = decoder.uint8(),
            index = decoder.uint32(),
            target;
        switch (code) {
            case ExchangeDescriptionCode.function:
                target = mod.typeSection.types;
                break;
            case ExchangeDescriptionCode.global:
                target = mod.globalSection.globals.map(g => g.variable);
                break;
            case ExchangeDescriptionCode.memory:
                target = mod.memorySection.memories;
                break;
            case ExchangeDescriptionCode.table:
                target = mod.tableSection.tables;
                break;
            default: throw new KWatError('Export Segment invalid description code');
        }
        if (!target[index]) { throw new KWatError('Export Segment invalid reference'); }
        return new ExportSegment(name, target[index]!)
    }
}

/** A section containing all the exported entities the module */
export class ExportSection extends Section<SectionTypes.export> {
    /** All the exported entity declarations of the section */
    public readonly exports!: ExportSegment[];

    /** Create an empty export section */
    public constructor() {
        super(SectionTypes.export);
        protect(this, 'exports', [], true);
    }

    /** Add a new export segment to the section, if not present,
     * also by checking the name of the segment.
     * @param {ExportSegment} segment the entity import definition
     * @returns {boolean} the success of the operation
     */
    public add(segment: ExportSegment): boolean {
        if (this.exports.some(e => e.name == segment.name)) {
            return false;
        }
        this.exports.push(segment);
        return true;
    }

    protected contentEncode(encoder: IEncoder, mod: Module) {
        if (!this.exports.length) { return; }
        if (this.exports.some(i => i.getIndex(mod) < 0)) {
            throw new KWatError('Invalid function definition index');
        }
        encoder.vector(this.exports, mod);
    }

    public override decode(decoder: IDecoder, mod: Module) {
        this.exports.length = 0;
        this.exports.push(...decoder.vector(ExportSegment, mod));
    }

}