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
import { Section, SectionTypes, ExchangeDescriptionCode } from './Section';
import type { Module } from '../Module';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';


/** Exchange type descriptor for {@link ImportDescription} */
type ExchangeNarrower<R extends ImportDescription> = { Description: R };

/** All possible types which are exchangeable in import operations */
export type ImportDescription = Types.FunctionType | Types.TableType | Types.MemoryType | Types.GlobalType;

/** A part of the import section which describe an import operation */
export class ImportSegment implements IEncodable<[Types.FunctionType[]]> {
    /** The name of the module from which import the entity */
    public Module: string;
    /** The name of the imported entity */
    public Name: string;
    /** A description of the imported entity */
    public Description: ImportDescription;

    /** Whether or not the import entity is a function declaration */
    public isFunction(): this is ExchangeNarrower<Types.FunctionType> {
        return this.Description instanceof Types.FunctionType;
    }
    /** Whether or not the import entity is a table declaration */
    public isTable(): this is ExchangeNarrower<Types.TableType> {
        return this.Description instanceof Types.TableType;
    }
    /** Whether or not the import entity is a memory declaration */
    public isMemory(): this is ExchangeNarrower<Types.MemoryType> {
        return this.Description instanceof Types.LimitType;
    }
    /** Whether or not the import entity is a global variable declaration */
    public isGlobal(): this is ExchangeNarrower<Types.GlobalType> {
        return this.Description instanceof Types.GlobalType;
    }
    /** The exchange code of the imported entity */
    public get code(): ExchangeDescriptionCode {
        if (this.isTable()) { return ExchangeDescriptionCode.table; }
        else if (this.isMemory()) { return ExchangeDescriptionCode.memory; }
        else if (this.isGlobal()) { return ExchangeDescriptionCode.global; }
        else if (this.isFunction()) { return ExchangeDescriptionCode.function; }
        return -1;
    }

    /** Create a new imported entity definition
     * @param {string} moduleName the module from which import
     * @param {string} name the name of the imported entity
     * @param {ImportDescription} description the description of the imported entity
     */
    public constructor(moduleName: string, name: string, description: ImportDescription) {
        this.Module = moduleName;
        this.Name = name;
        this.Description = description;
    }
    
    /** Retrieves the index of the imported entity as a function 
     * from an array of function definitions
     * @param {Types.FunctionType[]} fns the function defintions array searched
     * @param {boolean} [pass] don't throw exception on operation faliure
     * @returns {number} the index of the imported entity
     *                  relative to the given array of function definitions
     */
    public getIndex(fns: Types.FunctionType[], pass?: boolean): number {
        if (!this.isFunction()) { throw new Error('Can not get index from a non-function reference!'); }
        let index = fns.findIndex(x => x.equals(this.Description as Types.FunctionType));
        if (!pass && index < 0) { throw new Error('Invalid function definition index!') }
        return index;
    }

    /** Check if another value describes the same import definition
     * as declared by this object
     * @param {*} other the value to check
     * @returns {boolean} whether the other value describes
     *                      the same import definition
     */
    public equals(other: any): boolean {
        return other instanceof ImportSegment &&
                this.Name == other.Name &&
                this.Module == other.Module &&
                this.Description.equals(other.Description)
    }

    /** Deep copy the current object
     * @return {ImportSegment} the deep copy of the import definition
     */
    public clone(): ImportSegment { return new ImportSegment(this.Module, this.Name, this.Description.clone()); }

    public encode(encoder: IEncoder, context: Types.FunctionType[]) {
        if (this.isFunction()) {
            let index = this.getIndex(context);
            encoder
                .vector(this.Module)
                .vector(this.Name)
                .uint8(ExchangeDescriptionCode.function)
                .uint32(index)
            ;
        }
        else {
            let code = this.code;
            if (code < 0) { throw new Error('Invalid import description!'); }
            encoder
                .vector(this.Module)
                .vector(this.Name)
                .uint8(code)
                .encode(this.Description)
            ;
        }
    }

    /**Decode this object through a decoder
     * @param {IDecodder} decoder the decoder target of the reading
     * @param {Module} mod the module that holdds the type section
     * @return {ImportSegment} the read import segment
    */
    public static decode(decoder: IDecoder, mod: Module): ImportSegment {
        let ns = decoder.vector('utf8'),
            name = decoder.vector('utf8'),
            type = decoder.uint8(),
            desc;
        switch (type) {
            case ExchangeDescriptionCode.function: {
                let index = decoder.uint32();
                if (!mod.TypeSection.Types[index]) {
                    throw new Error('Invalid Import Segment function reference');
                }
                desc = mod.TypeSection.Types[index]!;
                break;
            }
            case ExchangeDescriptionCode.global:
                desc = decoder.decode(Types.GlobalType);
                break;
            case ExchangeDescriptionCode.memory:
                desc = decoder.decode(Types.LimitType);
                break;
            case ExchangeDescriptionCode.table:
                desc = decoder.decode(Types.TableType);
                break;
            default: throw new Error('Invalid Import Segment type: ' + type);
        }
        return new ImportSegment(ns, name, desc)
    }
}

/** A section containing all the imported entities the module */
export class ImportSection extends Section<SectionTypes.import> {
    /** All the imported entity declarations of the section */
    public readonly Imports!: ImportSegment[];

    /** Create an empty import section */
    public constructor() {
        super(SectionTypes.import);
        protect(this, 'Imports', [], true);
    }

    /** Retrieve the index of a declaration imported in this section
     * @param {ImportDescription} target the variable to search
     * @returns {number} the index of the declaration, `-1` if not found
     */
    public indexOf(target: ImportDescription): number {
        if (target instanceof Types.FunctionType) {
            return this.Imports.findIndex(i => i.isFunction() && i.Description.equals(target));
        }
        else if (target instanceof Types.MemoryType) {
            return this.Imports.findIndex(i => i.isMemory() && i.Description.equals(target));
        }
        else if (target instanceof Types.TableType) {
            return this.Imports.findIndex(i => i.isTable() && i.Description.equals(target));
        }
        else if (target instanceof Types.GlobalType) {
            return this.Imports.findIndex(i => i.isGlobal() && i.Description.equals(target));
        }
        return -1;
    }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Imports.length) { return; }
        if (this.Imports.filter(i => i.isFunction()).some(i => mod.TypeSection.indexOf(i.Description as Types.FunctionType) < 0 || i.code < 0)) {
            throw new Error('Invalid function definition index');
        }
        encoder.vector(this.Imports, mod.TypeSection.Types);
    }

    /** Add a new import segment to the section, if not present,
     * also by checking the equality of the segments.
     * @param {ImportSegment} segment the entity import definition
     * @param {Module} [mod] the module holding the type definition
     * @returns {boolean} the success of the operation
     */
    public add(segment: ImportSegment, mod?: Module): boolean {
        if (this.Imports.find(s => s.equals(segment))) {
            return false;
        }
        this.Imports.push(segment.clone());
        if (mod) {
            let target = null;
            switch (segment.code) {
                case ExchangeDescriptionCode.function: target = mod.TypeSection; break
                case ExchangeDescriptionCode.global: target = mod.GlobalSection; break
                // case ExchangeDescriptionCode.memory: target = mod.MemorySection; break
                // case ExchangeDescriptionCode.table: target = mod.TableSection; break
            }
            target && target.add(segment.Description as any);
        }
        return true;
    }

    public override decode(decoder: IDecoder, mod: Module) {
        this.Imports.length = 0;
        this.Imports.push(...decoder.vector(ImportSegment, mod));
    }

}