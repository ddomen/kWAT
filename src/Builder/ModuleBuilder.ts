import { Module } from '../Module';
import { FunctionImporterBuilder } from './FunctionImporterBuilder';
import { FunctionBuilder, FunctionDefinition } from './FunctionBuilder';
import type { BuildingCallback, IBuilder } from './index';
import {
    CodeSegment, CustomSections,
    DataMode, DataSegment,
    ExportSegment, GlobalVariable,
    ImportDescription, ImportSegment
} from '../Sections';
import {
    FunctionType, GlobalType, LimitType,
    MemoryType, NumberType, NumberTypeKey, ReferenceType, ReferenceTypeKey, TableType, Type, validReference, validReferenceKey
} from '../Types';
import {
    Expression,
    F32ConstInstruction, F64ConstInstruction,
    I32ConstInstruction, I64ConstInstruction,
    NumericConstInstruction
} from '../Instructions';

/** Allow to build a module with ease,
 * by preserving all the section informations
*/
export class ModuleBuilder implements IBuilder<Module> {
    /** @internal wasm version */
    private _version: number = 1;
    /** @internal declared function name map */
    private _functions: Record<string, FunctionDefinition> = {};
    /** @internal imports name map */
    private _imports: Record<string, ImportDescription> = {};
    /** @internal memories name map */
    private _memories: Record<string, MemoryType> = {};
    /** @internal tables name map */
    private _tables: Record<string, TableType> = {};
    /** @internal data table */
    private _data: Record<number, ArrayBuffer> = {};
    /** @internal global variables name map */
    private _globals: Record<string, GlobalVariable> = {};
    /** @internal target starter function */
    private _starter: string | null = null;
    /** @internal source mapo url */
    private _sourcemap: string | null = null;

    /** Retrieve the current setted version */
    public get CurrentVersion(): number { return this._version; }
    public get VersionString(): string {
        return [
            (this._version & 0xff),
            ((this._version & 0xff) << 8),
            ((this._version & 0xff) << 16),
            ((this._version & 0xff) << 24)
        ].join('.')
    }
    
    /** Get the current module Wasm version.
      * @returns {number} the current setted version
      */
     public version(): number;
    /** Set the current module Wasm version.
      * 
      * Actually Wasm runtimes expect the version to be equal to `1.0.0.0` (or `0x00000001`)
      * @param {number} version full version
      * @returns {this} the module itself (chainable method)
      */
     public version(version: number): this;
    /** Set the current module Wasm version.
     * 
     * Actually Wasm runtimes expect the version to be equal to `1.0.0.0` (or `0x00000001`)
     * @param {number} major major version `(x._._._)`
     * @param {number} minor minor version `(_.x._._)`
     * @param {number} patch patch version `(_._.x._)`
     * @param {number} build build version `(_._._.x)`
     * @returns {this} the module itself (chainable method)
     */
    public version(major: number, minor?: number, patch?: number, build?: number): this;
    public version(major?: number, minor?: number, patch?: number, build?: number): this | number {
        if (arguments.length === 0) { return this._version; }
        else if(arguments.length === 1) { this._version = Number(major) || 0; }
        else {
            this._version =  ((Number(major) || 0) & 0xff) |
                            (((Number(minor) || 0) & 0xff) << 8) |
                            (((Number(patch) || 0) & 0xff) << 16) |
                            (((Number(build) || 0) & 0xff) << 24);
        }
        return this;
    }

    /** @internal
     * Generates a random local name
     * @param {Record<string, *>} target the map of already defined names
     * @returns {this} the builder itself (chainable method)
     */
    private randomName(target: Record<string, any>): string {
        let name: string;
        do { name = Math.random().toString(16).slice(3); }
        while (name in target);
        return name;
    }

    /** Retrieve an already defined import of a table
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @return {(TableType|null)} the retrieved table, if found
     */
    public importTable(module: string, name: string): TableType | null;
    /** Define an import for a table
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @param {number} min the minimum amount of rows in the table
     * @param {number} [max] the maximum amount of rows in the table (undefined is unlimited)
     * @returns {this} the builder itself (chainable method)
     */
    public importTable(module: string, name: string, min: number, max?: number): this;
    public importTable(module: string, name: string, min?: number, max?: number): this | TableType | null {
        const mn = module + '.' + name;
        if (typeof(min) !== 'number') {
            return this._imports[mn] instanceof TableType ?
                    this._imports[mn]! as TableType :
                    null;
        }
        this._imports[mn] = new LimitType(min, max);
        return this;
    }

    
    /** Retrieve the default (first) table
     * @return {(TableType|null)} the retrieved table, if found
     */
    public table(): TableType | null;
    /** Retrieve the table by its local name
     * @param {string} localName the table local name
     * @return {(TableType|null)} the retrieved table, if found
     */
    public table(localName: string): TableType | null;
    /** Define an import for a table
     * @param {(ReferenceType | ReferenceTypeKey)} type the table elements type
     * @param {number} min the minimum amount of rows in the table
     * @param {string} [localName] the table local name to associate with
     * @returns {this} the builder itself (chainable method)
     */
    public table(type: ReferenceType | ReferenceTypeKey, min: number, localName?: string): this;
    /** Define an import for a table
     * @param {(ReferenceType | ReferenceTypeKey)} type the table elements type
     * @param {number} min the minimum amount of rows in the table
     * @param {number} [max] the maximum amount of rows in the table (undefined is unlimited)
     * @param {string} [localName] the table local name to associate with
     * @returns {this} the builder itself (chainable method)
     */
    public table(type: ReferenceType | ReferenceTypeKey, min: number, max: number, localName?: string): this;
    public table(...args: any[]): this | TableType | null {
        if (args.length === 0) { return this._tables[Object.keys(this._tables)[0] || ''] || null; }
        if (args.length === 1) { return this._tables[args[0]] || null; }
        let a = args[0], b = args[1], c = args[2], localName = args[3];
        if (typeof(a) === 'string') {
            if (!validReferenceKey(a)) { throw new Error('Table type not recognized: \'' + a + '\''); }
            a = Type[a];
        }
        if (!validReference(a)) { throw new Error('Table type not recognized: \'' + a +'\''); }
        b = Number(b) || 0;
        if (typeof(c) === 'string') { localName = c; c = undefined; }
        c = typeof(c) !== 'number' ? undefined : (Number(c) || 0);
        localName = localName || this.randomName(this._tables);
        if (localName in this._tables) { throw new Error('Table \'' + localName + '\' already defined in this module'); }
        this._tables[localName] = new TableType(a, b, c);
        return this;
    }

    /** Retrieve an already defined import of a memory
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @return {(MemoryType|null)} the retrieved memory, if found
     */
    public importMemory(module: string, name: string): MemoryType | null;
    /** Define an import for a memory
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @param {number} min the minimum amount of rows in the memory
     * @param {number} [max] the maximum amount of rows in the memory (undefined is unlimited)
     * @returns {this} the builder itself (chainable method)
     */
    public importMemory(module: string, name: string, min: number, max?: number): this;
    public importMemory(module: string, name: string, min?: number, max?: number): this | MemoryType | null {
        const mn = module + '.' + name;
        if (typeof(min) !== 'number') {
            return this._imports[mn] instanceof LimitType ?
                    this._imports[mn]! as MemoryType :
                    null;
        }
        this._imports[mn] = new LimitType(min, max);
        return this;
    }

    /** Retrieve the default (first) memory
     * @return {(MemoryType|null)} the retrieved memory, if found
     */
    public memory(): MemoryType | null;
    /** Retrieve the memory by its local name
     * @param {string} localName the memory local name
     * @return {(MemoryType|null)} the retrieved memory, if found
     */
    public memory(localName: string): MemoryType | null;
    /** Define an import for a memory
     * @param {number} min the minimum amount of rows in the memory
     * @param {string} [localName] the memory local name to associate with
     * @returns {this} the builder itself (chainable method)
     */
    public memory(min: number, localName?: string): this;
    /** Define an import for a memory
     * @param {number} min the minimum amount of rows in the memory
     * @param {number} [max] the maximum amount of rows in the memory (undefined is unlimited)
     * @param {string} [localName] the memory local name to associate with
     * @returns {this} the builder itself (chainable method)
     */
    public memory(min: number, max: number, localName?: string): this;
    public memory(...args: any[]): this | MemoryType | null {
        if (args.length === 0) { return this._memories[Object.keys(this._memories)[0] || ''] || null; }
        let a = args[0], b = args[1], localName = args[2];
        if (typeof(a) === 'string') { return this._memories[a] || null; }
        a = Number(a) || 0;
        if (typeof(b) === 'string') { localName = b; b = undefined; }
        b = typeof(b) !== 'number' ? undefined : (Number(b) || 0);
        localName = localName || this.randomName(this._memories);
        if (localName in this._memories) { throw new Error('Memory \'' + localName + '\' already defined in this module'); }
        this._memories[localName] = new LimitType(a, b);
        return this;
    }

    /** Retrieve a data segment buffer in the module 
     * @param {number} index the index of the data segment
     * @return {(Uint8Array|null)} the buffer, if found
     */
    public data(index: number): Uint8Array | null;
    /** Declare a data segment buffer in the module 
     * @param {number} index the index of the data segment
     * @param {(ArrayBuffer|number[]|string)} value the content of the data segment.
     *  If a string is given it will be threated as an utf8 char array.
     * @returns {this} the builder itself (chainable method)
     */
    public data(index: number, value: ArrayBuffer | Iterable<number> | string): this;
    public data(index: number, value?: ArrayBuffer | Iterable<number> | string): this | Uint8Array | null {
        if (typeof(value) === 'undefined') {
            return this._data[index] ?
                    new Uint8Array(this._data[index]!) :
                    null;
        }
        else if (typeof(value) === 'string') {
            const e = new TextEncoder()
            value = e.encode(value);
        }
        if (value instanceof ArrayBuffer) {
            this._data[index] = value;
            return this;
        }
        if (!ArrayBuffer.isView(value)) {
            try { value = new Uint8Array(Array.from(value)); } catch {}
        }
        if (!ArrayBuffer.isView(value)) {
            throw new Error('Can not convert value to an Uint8Array');
        }
        this._data[index] = value.buffer;
        return this;
    }

    /** Retrieve an already defined import of a global variable
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @return {(GlobalType|null)} the retrieved global variable, if found
     */
    public importGlobal(module: string, name: string): GlobalType | null;
    /** Define an import for a global variable
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @param {(NumberType | NumberTypeKey)} type the type of the global variable
     * @param {boolean} [constant] whether the variable is constant or mutable
     * @returns {this} the builder itself (chainable method)
     */
    public importGlobal(module: string, name: string, type: NumberType | NumberTypeKey, constant?: boolean): this;
    public importGlobal(module: string, name: string, type?: NumberType | NumberTypeKey, constant?: boolean): this | GlobalType | null {
        const mn = module + '.' + name;
        if (!type) {
            return this._imports[mn] instanceof GlobalType ?
                    this._imports[mn]! as GlobalType :
                    null;
        }
        if (typeof(type) === 'string') { type = Type[type]; }
        this._imports[mn] = new GlobalType(type, constant);
        return this;
    }

    /** Retrieve an already defined global variable by its local name
     * @param {string} localName the local name of the global variable
     * @return {(GlobalType|null)} the retrieved global variable, if found
     */
    public global(localName: string): GlobalVariable | null;
    /** Define a global variable in the module
     * @param {(Type.i64 | "i64")} type the type of the global variable
     * @param {(number|bigint)} initial the initial value
     * @param {string} [localName] the global variable local name to associate with
     * @param {boolean} [constant] whether the variable is constant or mutable
     * @returns {this} the builder itself (chainable method)
     */
    public global(type: Type.i64 | 'i64', initial: number | bigint, localName?: string, constant?: boolean): this;
    /** Define a global variable in the module
     * @param {(NumberType | NumberTypeKey)} type the type of the global variable
     * @param {number} initial the initial value
     * @param {string} [localName] the global variable local name to associate with
     * @param {boolean} [constant] whether the variable is constant or mutable
     * @returns {this} the builder itself (chainable method)
     */
    public global(type: NumberType | NumberTypeKey, initial?: number, localName?: string, constant?: boolean): this;
    public global(type: string | NumberType | NumberTypeKey, initial?: number | bigint, localName?: string, constant?: boolean): this | GlobalVariable | null {
        if (type in Type && typeof(type) === 'string') { type = Type[type as any] as any as NumberType; }
        if (typeof(type) === 'string') { return this._globals[type] || null; }
        localName = localName || this.randomName(this._globals);
        if (localName in this._globals) {
            throw new Error('Global \'' + localName + '\' already defined in this module');
        }
        let i: new(v?: number) => NumericConstInstruction;
        switch (type) {
            case Type.i32: i = I32ConstInstruction;
            case Type.i64: i = I64ConstInstruction;
            case Type.f32: i = F32ConstInstruction;
            case Type.f64: i = F64ConstInstruction;
        }
        this._globals[localName] = new GlobalVariable(
            type,
            new Expression([ new i(initial as number) ]),
            constant
        );
        return this;
    }

    /** Retrieve an already defined import of a function
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @return {(GlobalType|null)} the retrieved function, if found
     */
    public importFunction(module: string, name: string): FunctionType | null;
    /** Define an import for a function
     * @param {string} module the reference module
     * @param {string} name the name of the import
     * @param {BuildingCallback<FunctionImporterBuilder>} fn
     *      the callback used to build the function import
     * @returns {this} the builder itself (chainable method)
     */
    public importFunction(module: string, name: string, fn: BuildingCallback<FunctionImporterBuilder>): this;
    public importFunction(module: string, name: string, fn?: BuildingCallback<FunctionImporterBuilder>): this | FunctionType | null {
        const mn = module + '.' + name;
        if (!fn) {
            return this._imports[mn] instanceof FunctionType ?
                    this._imports[mn]! as FunctionType :
                    null;
        }
        this._imports[mn] = fn(new FunctionImporterBuilder(this)).build();
        return this;
    }
    
    /** Retrieve an already function definition by its local name
     * @param {string} localName the local name of the function definition
     * @return {(FunctionDefinition|null)} the retrieved global variable, if found
     */
    public function(localName: string): FunctionDefinition | null;
    /** Define a function in the module
     * @param {BuildingCallback<FunctionImporterBuilder>} fn
     *      the callback used to build the function details
     * @param {string} [localName] the function  local name to associate with
     * @param {boolean} [starter] whether the function will be used as starter
     *      (will it be called just after the module loads?)
     * @returns {this} the builder itself (chainable method)
     */
    public function(fn: BuildingCallback<FunctionBuilder>, localName?: string, starter?: boolean): this;
    public function(fn: BuildingCallback<FunctionBuilder> | string, localName?: string, starter?: boolean): this | FunctionDefinition | null {
        if (typeof(fn) === 'string') { return this._functions[fn] || null; }
        localName = localName || this.randomName(this._functions);
        if (localName in this._functions) { throw new Error('Function \'' + localName + '\' already defined in this module'); }
        this._functions[localName] = fn(new FunctionBuilder(this)).build();
        if (starter) { this._starter = localName; }
        return this;
    }

    /**Retrieve the current starter function name
     * @return {string} the current function starter name
     */
    public starter(): string | null;
    /**Set the current starter function name
     * @param {string} name the current function starter name
     * @returns {this} the builder itself (chainable method)
     */
    public starter(name: string | null): this;
    public starter(name?: string | null): this | string | null {
        if (typeof(name) === 'undefined') { return this._starter; }
        else if (name === null) { this._starter = null; }
        else if (name in this._functions) { this._starter = name; }
        return this;
    }
    /**Remove the starter status from the function
     * @returns {this} the builder itself (chainable method)
     */
    public removeStarter(): this { return this.starter(null); }

    /**Set the current source map url
     * @param {string} url the source map url
     * @returns {this} the builder itself (chainable method)
     */
    public sourceMap(url: string | null): this { this._sourcemap = url; return this; }
    /**Remove the source map url
     * @returns {this} the builder itself (chainable method)
     */
    public unsetSourceMap(): this { return this.sourceMap(null); }

    public build(): Module {
        const m = new Module(this._version);
        const names = new CustomSections.NameCustomSection();
        m.CustomSections.push(names);
        for (const name in this._imports) {
            const mn = (name + '').split('.', 2);
            const im = new ImportSegment(mn[0]!, mn[1]!, this._imports[name]!);
            m.ImportSection.add(im, m);
        }
        for (const name in this._globals) {
            const g = this._globals[name]!;
            const gv = new GlobalVariable(
                g.Variable.Type,
                new Expression(g.Initialization.Instructions),
                g.Variable.Constant
            );
            m.GlobalSection.add(gv);
        }
        for (const _ in this._data) {
            // const d = this._data[index]!;
            const ds = new DataSegment(DataMode.passive);
            throw new Error('Data Sections building not yet implemented');
            m.DataSection.add(ds)
        }
        for (const name in this._memories) {
            const mm = this._memories[name]!;
            m.MemorySection.add(new LimitType(mm.Min, mm.Max));
        }
        let keys = Object.keys(this._functions);
        for (const name in this._functions) {
            const def = this._functions[name]!;
            const i = m.TypeSection.indexOf(this._functions[name]!.type);
            if (def.exported) { m.ExportSection.add(new ExportSegment(def.exported, def.type)); }
            m.TypeSection.add(def.type);
            m.FunctionSection.add(def.type);
            m.CodeSection.add(new CodeSegment(def.type, def.body, Object.values(def.locals)));
            if (i !== -1) {
                names.function(new CustomSections.NameReference(i, name));
                if (this._starter === name) { m.StartSection.Target = m.TypeSection.Types[i]!; }
            }
            def.references.map(k => keys.indexOf(k))
        }
        if (this._sourcemap) { m.CustomSections.push(new CustomSections.SourceMapSection(this._sourcemap)); }
        return m;
    }
}
