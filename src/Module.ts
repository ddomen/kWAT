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

import { protect } from './internal';
import { KWatError } from './errors';
import { BuildingCallback, ModuleBuilder } from './Builder';
import { IEncoder ,IDecoder, IEncodable, Relaxations } from './Encoding';
import * as Sections from './Sections';
import type { ImportDescription } from './Sections';
import { FunctionType, GlobalType, MemoryType, TableType } from './Types';

const ModuleMagic = 0x6d736100;

const DefaultOptions: WasmOptions = {
    extendedLEB128: false,
    debugNames: true,
    customSections: true,

    exceptions: false,
    mutableGlobals: true,
    saturateFloatToInt: false,
    signExtension: true,
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
    
    /** Experimental exception handling instructions
     * @todo
    */
    exceptions: boolean,
    /** Include mutable globals ***[Standardized]*** */
    mutableGlobals: boolean,
    /** Include saturating float-to-int instructions
     * @todo
    */
    saturateFloatToInt: boolean,
    /** Include sign extensions instructions ***[Standardized]*** */
    signExtension: boolean,
    /** Include SIMD instructions (Single Instruction Multiple Data)
     * ***[Standardized]***
     * @todo
    */
    SIMD: boolean,
    /** Include threading instructions
     * @todo
    */
    threads: boolean,
    /** Include multiple values instructions
     * @todo
    */
    multiValue: boolean,
    /** Include tail call instructions */
    tailCall: boolean,
    /** Include bulk memory instructions */
    bulkMemory: boolean,
    /** Include reference type instructions
     * @todo
    */
    referenceTypes: boolean,
    
    /** Allow definition of multiple tables in the same module */
    multipleTables: boolean,
    /** Allow definition of multiple memories in the same module */
    multipleMemory: boolean
}

/** A class that represents a Wasm module and manage the
 * encoding of physical and logical memory.
 */
export class Module implements IEncodable<WasmOptions> {

    /** The version used for this Wasm module (v1 default) */
    public version: number;

    /** The type section of the module.
     * Declares a table of type indexes and their declarations.
     * @readonly
     * @see {@link Sections.TypeSection}
    */
    public readonly typeSection!: Sections.TypeSection;
    /** The function section of the module.
     * Declares a table of function index and their respective type.
     * @readonly
     * @see {@link Sections.FunctionSection}
    */
    public readonly functionSection!: Sections.FunctionSection;
    /** The table section of the module.
     * Contains the module table declarations.
     * @readonly
     * @see {@link Sections.TableSection}
    */
    public readonly tableSection!: Sections.TableSection;
    /** The memory section of the module.
     * Contains the module memory declarations.
     * @readonly
     * @see {@link Sections.MemorySection}
    */
    public readonly memorySection!: Sections.MemorySection;
    /** The global section of the module.
     * Contains mutable and unmutable global variable descriptions.
     * @readonly
     * @see {@link Sections.GlobalSection}
    */
    public readonly globalSection!: Sections.GlobalSection;
    /** The element section of the module.
     * Contains the data that initialize the module tables.
     * @readonly
     * @see {@link Sections.ElementSection}
    */
    public readonly elementSection!: Sections.ElementSection;
    /** The data section of the module.
     * Contains the data that initialize the module memories.
     * @readonly
     * @see {@link Sections.DataSection}
    */
    public readonly dataSection!: Sections.DataSection;
    /** The start section of the module
     * Describes the start function executed when the module loads.
     * @readonly
     * @see {@link Sections.StartSection}
    */
    public readonly startSection!: Sections.StartSection;
    /** The import section of the module
     * Contains a map of imported types and their names.
     * @readonly
     * @see {@link Sections.ImportSection}
    */
    public readonly importSection!: Sections.ImportSection;
    /** The export section of the module.
     * Contains a map of exported types and their names.
     * @readonly
     * @see {@link Sections.ExportSection}
    */
    public readonly exportSection!: Sections.ExportSection;
    /** The data count section of the module.
     * Describes the length of the data section,
     * will be automatically calculated.
     * @readonly
     * @see {@link Sections.DataCountSection}
    */
    public readonly dataCountSection!: Sections.DataCountSection;
    /** The type section of the module.
     * Contains the body of the declared functions.
     * @readonly
     * @see {@link Sections.CodeSection}
    */
    public readonly codeSection!: Sections.CodeSection;
    /** The custom sections of the module.
     * Is an array of the custom sections
     * (eg. debug names, source maps, etc)
     * @readonly
     * @see {@link Sections.CustomSection}
    */
    public readonly customSections!: Sections.CustomSection[];

    /** An array of all the sections of this module
     * sorted by precedence as described by the standards.
     * The order will also be the order in the physical memory.
    */
    public get sections(): Sections.Section[] {
        return [
            this.typeSection,
            this.functionSection,
            this.tableSection,
            this.memorySection,
            this.globalSection,
            this.elementSection,
            this.dataCountSection,
            this.dataSection,
            this.startSection,
            this.importSection,
            this.exportSection,
            this.codeSection,
            ...this.customSections,
        ].sort((s1, s2) => s1.precedence - s2.precedence);
    }

    /**
     * Create an empty module
     * @param {number} [version=1] the Wasm version used
     */
    constructor(version: number = 1) {
        this.version = version;
        protect(this, 'typeSection', new Sections.TypeSection(), true);
        protect(this, 'functionSection', new Sections.FunctionSection(), true);
        protect(this, 'tableSection', new Sections.TableSection(), true);
        protect(this, 'memorySection', new Sections.MemorySection(), true);
        protect(this, 'globalSection', new Sections.GlobalSection(), true);
        protect(this, 'elementSection', new Sections.ElementSection(), true);
        protect(this, 'startSection', new Sections.StartSection(), true);
        protect(this, 'importSection', new Sections.ImportSection(), true);
        protect(this, 'exportSection', new Sections.ExportSection(), true);
        protect(this, 'dataSection', new Sections.DataSection(), true);
        protect(this, 'dataCountSection', new Sections.DataCountSection(), true);
        protect(this, 'codeSection', new Sections.CodeSection(), true);
        protect(this, 'customSections', [], true);
    }

    /** Encode this module through an encoder
     * @param {IEncoder} encoder the encoder target of the writing
     * @param {WasmOptions} [options] the options used to write the module to the encoder
     * @return {void} nothing
     */
    public encode(encoder: IEncoder, options?: Partial<WasmOptions>): void {
        options = Object.assign({}, DefaultOptions, options)
        const e = encoder.spawn();
        e.relaxation = options.extendedLEB128 ? Relaxations.Full : Relaxations.Canonical;
        let sects = this.sections;
        if (!options.debugNames) { sects = sects.filter(s => !(s instanceof Sections.CustomSections.NameCustomSection)); }
        if (!options.customSections) { sects = sects.filter(s => !(s instanceof Sections.CustomSection)); }
        e
            .uint32(ModuleMagic, Relaxations.None)
            .uint32(this.version, Relaxations.None)
            .array(sects, this, options as WasmOptions)
        ;
        encoder.append(e);
    }

    /** Reads and decodes a module from a decoder
     * @param {IDecoder} decoder the target decoder
     * @return {Module} the read module
    */
    public static decode(decoder: IDecoder): Module {
        const magic = decoder.uint32(Relaxations.None);
        if (magic !== ModuleMagic) {
            throw new KWatError('Invalid Module Magic: 0x' + magic.toString(16) + ' (0x' + ModuleMagic.toString(16) + ')');
        }
        const m = new Module();
        m.version = decoder.uint32(Relaxations.None);
        let type: number, size: number, precedence: number = 0,
            slice: IDecoder, sections: IDecoder[] = [];
        while (decoder.remaining) {
            type = decoder.uint8();
            if (!(type in Sections.SectionTypes)) { throw new KWatError('Invalid Section type: ' + type); }
            size = decoder.uint32();
            slice = decoder.slice(size);
            if (type === Sections.SectionTypes.custom) {
                m.customSections.push(Sections.CustomSection.decode(slice).after(precedence));
            }
            else if (sections[type]) { throw new KWatError('Duplicated Section type: ' + type); }
            else {
                precedence = type;
                sections[type] = slice;
            }
        }
        let section, modSects = m.sections;
        for (let i in sections) {
            const x = parseInt(i);
            section = modSects.find(s => s.type === x);
            if (!section) { throw new KWatError('Module Section not found: ' + i); }
            section.decode(sections[i]!, m);
        }
        return m;
    }

    /** Retrieve the index of a section element, resolving it by
     * counting also the elements of the import section of the same type
     * @param {ImportDescription} search the section element to search
     * @returns {number} the index of the section element, `-1` if not found
     */
    public indexOf(search: ImportDescription, byRef: boolean = false): number {
        let index = -1, imports: ImportDescription[], target: { indexOf(a: any): number };
        if (search instanceof FunctionType) {
            target = byRef ? this.functionSection.functions : this.functionSection;
            imports = this.importSection.imports.filter(i => i.isFunction()).map(i => i.description);
        }
        else if (search instanceof MemoryType) {
            target = byRef ? this.memorySection.memories : this.memorySection;
            imports = this.importSection.imports.filter(i => i.isMemory()).map(i => i.description);
        }
        else if (search instanceof TableType) {
            target = byRef ? this.tableSection.tables : this.tableSection;
            imports = this.importSection.imports.filter(i => i.isTable()).map(i => i.description);
        }
        else if (search instanceof GlobalType) {
            target = byRef ? this.globalSection.globals : this.globalSection;
            imports = this.importSection.imports.filter(i => i.isGlobal()).map(i => i.description);
        }
        else { return -1; }
        index = byRef ? imports.indexOf(search) : this.importSection.indexOf(search);
        if (index === -1) { index = target.indexOf(search) + imports.length; }
        return index;
    }

    /** Create a builder that make it easy to fill the current module
     * @param {BuildingCallback<ModuleBuilder>} builder
     *      a callback describing the steps of the module building
     * @return {Module} the built module
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