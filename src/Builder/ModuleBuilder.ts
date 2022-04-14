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
    MemoryType, NumberType, NumberTypeKey, Type
} from '../Types';
import {
    Expression,
    F32ConstInstruction, F64ConstInstruction,
    I32ConstInstruction, I64ConstInstruction,
    NumericConstInstruction
} from '../Instructions';

export class ModuleBuilder implements IBuilder<Module> {
    private _version: number = 1;
    private _functions: { [key: string]: FunctionDefinition } = {};
    private _imports: { [key: string]: ImportDescription } = {};
    private _memories: { [key: string]: MemoryType } = {};
    private _data: { [key: number]: ArrayBuffer } = {};
    private _globals: { [key: string]: GlobalVariable } = {};
    private _starter: string | null = null;
    private _sourcemap: string | null = null;

    public get CurrentVersion(): number { return this._version; }
    
    public version(version: number): this { this._version = Math.max(1, Number(version) || 0); return this; }

    private randomName(target: { [key: string]: any }): string {
        let name: string;
        do { name = Math.random().toString(16).slice(3); }
        while (name in target);
        return name;
    }

    public importMemory(module: string, name: string): ImportDescription | null;
    public importMemory(module: string, name: string, min: number, max?: number): this;
    public importMemory(module: string, name: string, min?: number, max?: number): this | ImportDescription | null {
        const mn = module + '.' + name;
        if (typeof(min) !== 'number') {
            return this._imports[mn] instanceof LimitType ?
                    this._imports[mn]! as MemoryType :
                    null;
        }
        this._imports[mn] = new LimitType(min, max);
        return this;
    }

    public memory(localName: string): MemoryType | null;
    public memory(min: number, localName?: string): this;
    public memory(min: number, max: number, localName?: string): this;
    public memory(...args: any[]): this | MemoryType | null {
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

    public data(index: number): Uint8Array | null;
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

    public importGlobal(module: string, name: string): GlobalType | null;
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

    public global(localName: string): GlobalVariable | null;
    public global(type: Type.i64 | 'i64', initial: number | bigint, localName?: string, constant?: boolean): this;
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


    public importFunction(module: string, name: string): FunctionType | null;
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

    public function(localName: string): FunctionDefinition | null;
    public function(fn: BuildingCallback<FunctionBuilder>, localName?: string, starter?: boolean): this;
    public function(fn: BuildingCallback<FunctionBuilder> | string, localName?: string, starter?: boolean): this | FunctionDefinition | null {
        if (typeof(fn) === 'string') { return this._functions[fn] || null; }
        localName = localName || this.randomName(this._functions);
        if (localName in this._functions) { throw new Error('Function \'' + localName + '\' already defined in this module'); }
        this._functions[localName] = fn(new FunctionBuilder(this)).build();
        if (starter) { this._starter = localName; }
        return this;
    }

    public starter(name: string): this {
        if (name in this._functions) { this._starter = name; }
        return this;
    }

    public sourceMap(url: string | null): this { this._sourcemap = url; return this; }
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
