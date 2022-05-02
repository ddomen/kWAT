import { Module } from '../Module';
import { Reader } from '../Dumping';
import { protect } from '../internal';
import { Decoder } from '../Encoding';
import { KWatError } from '../errors';
import { decompile } from '../Compilation';
import { ExchangeDescriptionCode } from '../Sections';
import { GlobalType, MemoryType, TableType, Type } from '../Types';

export type KWModuleInit = ArrayBuffer | ArrayBufferView | number[] | Response | Promise<Response>;

const compile = (function(){
    if (typeof(WebAssembly) !== 'undefined') {
        if ('compileStream' in WebAssembly) {
            return function(buffer: KWModuleInit) {
                if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
                if (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer)) {
                    return WebAssembly.compile(buffer)
                }
                return WebAssembly.compileStreaming(buffer);
            }
        }
        else if ('compile' in WebAssembly) {
            return function(buffer: KWModuleInit) {
                if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
                if (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer)) {
                    return WebAssembly.compile(buffer)
                }
                return Promise.resolve(buffer)
                    .then(r => r.arrayBuffer())
                    .then(WebAssembly.compile);
            }
        }
    }
    return function(buffer: KWModuleInit) {
        if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
        if (ArrayBuffer.isView(buffer)) { buffer = buffer.buffer; }
        if (buffer instanceof ArrayBuffer) { return Promise.resolve(new KWModulePoly(buffer)); }
        return Promise.resolve(buffer)
            .then(r => r.arrayBuffer())
            .then(b => new KWModulePoly(b));
    }
})();

const instantiate = (function(){
    if (typeof(WebAssembly) !== 'undefined') {
        if ('instantiateStream' in WebAssembly) {
            return function(buffer: KWModuleInit | WebAssembly.Module, imports?: WebAssembly.Imports | undefined) {
                if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
                if (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer)) {
                    return WebAssembly.instantiate(buffer, imports)
                }
                if (buffer instanceof WebAssembly.Module) {
                    return WebAssembly.instantiate(buffer, imports).then(i => ({
                        module: buffer,
                        instance: i
                    }));
                }
                return WebAssembly.instantiateStreaming(buffer, imports);
            }
        }
        else if ('instantiate' in WebAssembly) {
            return function(buffer: KWModuleInit | WebAssembly.Module, imports?: WebAssembly.Imports | undefined) {
                if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
                if (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer)) {
                    return WebAssembly.instantiate(buffer, imports)
                }
                if (buffer instanceof WebAssembly.Module) {
                    return WebAssembly.instantiate(buffer, imports).then(i => ({
                        module: buffer,
                        instance: i
                    }))
                }
                return Promise.resolve(buffer)
                    .then(r => r.arrayBuffer())
                    .then(WebAssembly.instantiate)
                    .then(i => ({ module: buffer, instance: i }));
            }
        }
    }
    return function(buffer: KWModuleInit | WebAssembly.Module, imports?: WebAssembly.Imports | undefined) {
        if (Array.isArray(buffer)) { buffer = new Uint8Array(buffer); }
        if (ArrayBuffer.isView(buffer)) { buffer = buffer.buffer; }
        if (buffer instanceof ArrayBuffer) {
            const module = new KWModulePoly(buffer);
            return Promise.resolve({ module, instance: new KWInstancePoly(module, imports) });
        }
        if (buffer instanceof WebAssembly.Module) {
            return Promise.resolve({ module: buffer, instance: new KWInstancePoly(buffer as KWModulePoly, imports) });
        }
        return Promise.resolve(buffer)
            .then(r => r.arrayBuffer())
            .then(b => new KWModulePoly(b))
            .then(m => ({ module: m, instance: new KWInstancePoly(m, imports) }));
    }
})();

const customSections = typeof(WebAssembly) !== 'undefined' && 'Module' in WebAssembly &&
                        'customSections' in WebAssembly.Module && WebAssembly.Module.customSections || 
                        function(mod: WebAssembly.Module, name: string) { return ((mod as KWModulePoly).customSections[name] || []) as ArrayBuffer[]; };
const modExports = typeof(WebAssembly) !== 'undefined' && 'Module' in WebAssembly &&
                'exports' in WebAssembly.Module && WebAssembly.Module.exports ||
                function (mod: WebAssembly.Module) { return (mod as KWModulePoly).exports; };
const modImports = typeof(WebAssembly) !== 'undefined' && 'Module' in WebAssembly &&
                'imports' in WebAssembly.Module && WebAssembly.Module.imports || 
                function (mod: WebAssembly.Module) { return (mod as KWModulePoly).imports; };

export type KWInstantiatedModule = { instance: KWInstance, module: KWModule }

class KWModulePoly implements WebAssembly.Module {
    public readonly buffer!: ArrayBuffer;
    public readonly module!: Module;
    public readonly exports!: WebAssembly.ModuleExportDescriptor[];
    public readonly imports!: WebAssembly.ModuleImportDescriptor[];
    public readonly customSections!: { readonly [keys: string]: readonly ArrayBuffer[] };
    public constructor(buffer: ArrayBuffer) {
        protect(this, 'buffer', buffer);
        protect(this, 'module', decompile(new Uint8Array(this.buffer)));
        protect(this, 'exports', this.module.ExportSection.Exports.map(e => ({
            name: e.Name,
            kind: ExchangeDescriptionCode[e.code] as WebAssembly.ImportExportKind
        })));
        protect(this, 'imports', this.module.ImportSection.Imports.map(i => ({
            kind: ExchangeDescriptionCode[i.code] as WebAssembly.ImportExportKind,
            module: i.Module,
            name: i.Name
        })));
        protect(this, 'customSections', this.module.CustomSections.reduce((a, cs) => a[cs.Name] = [], {} as any));
        const r = new Reader(buffer);
        r.on('section.custom', cs => {
            const d = new Decoder(cs.value.data);
            d.vector('utf8');
            (this.customSections as any)[cs.value.name] = d.read(d.remaining).buffer;
        })
        r.read();
        for (let k in this.customSections) { Object.freeze(this.customSections[k]); }
        Object.freeze(this.customSections);
    }
}

function isValidImport(value: any) {
    return value && (
        typeof(value) === 'number' ||
        typeof(value) === 'function' ||
        value instanceof WebAssembly.Global ||
        value instanceof WebAssembly.Memory ||
        value instanceof WebAssembly.Table
    );
}

class KWInstancePoly implements WebAssembly.Instance {
    public readonly exports!: WebAssembly.Exports;
    public readonly imports!: WebAssembly.Imports;
    public readonly module!: KWModulePoly;
    public readonly functions!: Function[];
    public readonly memories!: WebAssembly.Memory[];
    public readonly tables!: WebAssembly.Table[];
    public readonly globals!: WebAssembly.Global[];
    public readonly tags!: KWTagPoly[];
    public constructor(module: KWModulePoly, imports?: WebAssembly.Imports | undefined) {
        protect(this, 'module', module);
        protect(this, 'imports', {});
        if (typeof(imports) === 'object' && imports) {
            for (let m in imports) {
                const mod = imports[m]!;
                if (typeof(mod) !== 'object' || !mod) { continue; }
                const q: WebAssembly.ModuleImports = {};
                for (let n in mod) {
                    const imp = mod[n]!;
                    if (!isValidImport(imp)) { continue; }
                    q[n] = imp;
                }
                if (Object.keys(q).length) { this.imports[m] = q; }
            }
        }
        protect(this, 'functions', []);
        this.module.module.ImportSection.Imports.forEach(i => {
            if (i.isFunction()) {
                const m = this.imports[i.Module];
                if (!m) { throw new KWatError('Missing imported module: "' + i.Module + '"'); }
                const v = m[i.Name];
                if (!v) { throw new KWatError('Missing imported function: "' + i.Module + '"'); }
                if (typeof(v) !== 'function') { throw new KWatError('Expecting import to be a function: "' + i.Module + '.' + i.Name + '"'); }
                this.functions.push(v);
            }
        });
        // this.module.module.CodeSection.Codes.forEach(c => {
            // this.functions.push(c.Body.compile());
        // });

        protect(this, 'memories',
            this.module.module.ImportSection.Imports
            .filter(i => i.isMemory())
            .map(i => i.Description as MemoryType)
            .concat(this.module.module.MemorySection.Memories)
            .map(m => new KWMemoryPoly({
                initial: m.Min,
                maximum: m.Max
            }))
        );

        protect(this, 'tables',
            this.module.module.ImportSection.Imports
            .filter(i => i.isTable())
            .map(i => i.Description as TableType)
            .concat(this.module.module.TableSection.Tables)
            .map(t => new KWTablePoly({
                element: Type[t.Reference] as WebAssembly.TableKind,
                initial: t.Limits.Min,
                maximum: t.Limits.Max
            }))
        );

        protect(this, 'globals',
            this.module.module.ImportSection.Imports
            .filter(i => i.isGlobal())
            .map(i => i.Description as GlobalType)
            .concat(
                this.module.module.GlobalSection.Globals
                .map(g => g.Variable)
            )
            .map(g => new KWGlobalPoly({
                value: Type[g.Type] as WebAssembly.ValueType,
                mutable: !g.Constant
            }))
        );

        protect(this, 'tags', 
            this.module.module.ImportSection.Imports.filter(i => (i.code as number) === 0x04)
            .map(i => i.Description as any)
            .map(t => new KWTagPoly({ parameters: t.Parameters }))
        );
    }
}

const PAGE_MAX = 65536;
const PAGE_SIZE = 65536;
class KWMemoryPoly implements WebAssembly.Memory {
    public buffer: ArrayBuffer;
    public readonly maximum: number | undefined;
    public readonly shared!: boolean;
    constructor(descriptor: WebAssembly.MemoryDescriptor) {
        if (typeof(descriptor) !== 'object') {
            throw new TypeError('Argument 0 must be a memory descriptor');
        }
        descriptor = Object.assign({}, descriptor);
        if (!('initial' in descriptor)) {
            throw new TypeError('Property \'initial\' is required');
        }
        descriptor.initial = Number(descriptor.initial);
        if (isNaN(descriptor.initial) || !isFinite(descriptor.initial)) {
            throw new TypeError('Property \'initial\' must be convertible to a valid number');
        }
        if (descriptor.initial < 0) {
            throw new TypeError('Property \'initial\' must be non-negative');
        }
        if(descriptor.initial > PAGE_MAX) {
            throw new TypeError(
                'Property \'initial\': value ' + descriptor.initial  +
                ' is above the upper bound ' + PAGE_MAX
            );
        }
        if (typeof(descriptor.maximum) !== 'undefined') {
            descriptor.maximum = Number(descriptor.maximum);
            if (isNaN(descriptor.maximum) || !isFinite(descriptor.maximum)) {
                throw new TypeError('Property \'maximum\' must be convertible to a valid number');
            }
            if (descriptor.maximum < 0) {
                throw new TypeError('Property \'maximum\' must be non-negative');
            }
            if (descriptor.maximum < descriptor.initial) {
                throw new RangeError(
                    'Property \'maximum\': value ' + descriptor.maximum +
                    ' is below the lower bound ' + descriptor.initial
                );
            }
        }
        this.buffer = KWMemoryPoly.instantiate(descriptor.initial);
        protect(this, 'maximum', descriptor.maximum);
        protect(this, 'shared', !!descriptor.shared);
    }
    public grow(delta: number): number {
        delta = Number(delta);
        if (isNaN(delta) || !isFinite(delta)) { throw new TypeError('Argument 0 must be convertible to a valid number'); }
        if (delta < 0) { throw new TypeError('Argument 0 must be non-negative'); }
        const lastLen = this.buffer.byteLength / PAGE_SIZE;
        if (lastLen + delta > PAGE_MAX) { throw new RangeError('Unable to grow instance memory'); }
        if (typeof(this.maximum) !== 'undefined' && lastLen + delta > this.maximum) {
            throw new RangeError('Maximum memory size exceeded');
        }
        try { this.buffer = KWMemoryPoly.instantiate(lastLen + delta); }
        catch { return -1; }
        return lastLen;
    }

    private static instantiate(pageSize: number): ArrayBuffer {
        return new Uint8Array((Math.floor(Number(pageSize) || 0)) * PAGE_SIZE).buffer
    }
}

function isValidAnyFunc(value: any) {
    return (
        typeof(value) !== 'function' &&
        typeof(value) !== 'undefined' && value !== null
    ) || (
        typeof(value) === 'function' &&
        isNaN(parseInt(value.name))
    );
}

type KWTableType<E extends WebAssembly.TableKind = WebAssembly.TableKind> = E extends 'anyfunc' ? (Function | null) : any;

const MAX_TABLE_SIZE = 10000000;
class KWTablePoly<E extends WebAssembly.TableKind = WebAssembly.TableKind>
    implements WebAssembly.Table {
    public readonly elements!: KWTableType<E>[];
    public readonly type!: E;
    public readonly maximum: number | undefined;
    public get length(): number { return this.elements.length; }
    public constructor(descriptor: WebAssembly.TableDescriptor & { element: E }) {
        if (typeof(descriptor) !== 'object') {
            throw new TypeError('Argument 0 must be a table descriptor');
        }
        descriptor = Object.assign({}, descriptor);
        if (descriptor.element !== 'anyfunc' && descriptor.element !== 'externref') {
            throw new TypeError('Descriptor property \'element\' must be a WebAssembly reference type');
        }
        if (!('initial' in descriptor)) {
            throw new TypeError('Property \'initial\' is required');
        }
        if (isNaN(descriptor.initial) || !isFinite(descriptor.initial)) {
            throw new TypeError('Property \'initial\' must be convertible to a valid number');
        }
        if (descriptor.initial < 0) {
            throw new TypeError('Property \'initial\' must be non-negative');
        }
        if(descriptor.initial > MAX_TABLE_SIZE) {
            throw new TypeError(
                'Property \'initial\': value ' + descriptor.initial  +
                ' is above the upper bound ' + MAX_TABLE_SIZE
            );
        }
        if (typeof(descriptor.maximum) !== 'undefined') {
            descriptor.maximum = Number(descriptor.maximum);
            if (isNaN(descriptor.maximum) || !isFinite(descriptor.maximum)) {
                throw new TypeError('Property \'maximum\' must be convertible to a valid number');
            }
            if (descriptor.maximum < 0) {
                throw new TypeError('Property \'maximum\' must be non-negative');
            }
            if (descriptor.maximum < descriptor.initial) {
                throw new RangeError(
                    'Property \'maximum\': value ' + descriptor.maximum +
                    ' is below the lower bound ' + descriptor.initial
                );
            }
        }
        protect(this, 'elements', []);
        protect(this, 'type', descriptor.element);
        protect(this, 'maximum', descriptor.maximum);
    }

    public get(index: number): KWTableType<E> {
        index = Number(index);
        if (isNaN(index) || !isFinite(index)) {
            throw new TypeError('Argument 0 must be convertible to a valid number');
        }
        index = Math.floor(index);
        if (index < 0) { throw new TypeError('Argument 0 must be non-negative'); }
        if (index >= this.elements.length) {
            throw new RangeError('Invalid ' + index + ' 100 into function table')
        }
        return this.elements[index]!;
    }
    public set(index: number, value?: KWTableType<E>): void {
        index = Number(index);
        if (isNaN(index) || !isFinite(index)) {
            throw new TypeError('Argument 0 must be convertible to a valid number');
        }
        index = Math.floor(index);
        if (index < 0) { throw new TypeError('Argument 0 must be non-negative'); }
        if (index >= this.elements.length) {
            throw new RangeError('Invalid ' + index + ' 100 into function table')
        }
        if (this.type === 'anyfunc') {
            if (!isValidAnyFunc(value)) { 
                throw new TypeError('Argument 1 must be null or a WebAssembly function of type compatible to this');
            }
            value ||= null;
        }
        this.elements[index] = value!;
    }
    public grow(delta: number, value?: KWTableType<E>): number {
        delta = Number(delta);
        if (isNaN(delta) || !isFinite(delta)) { throw new TypeError('Argument 0 must be convertible to a valid number'); }
        if (delta < 0) { throw new TypeError('Argument 0 must be non-negative'); }
        const lastLen = this.elements.length;
        delta = Math.floor(delta);
        if (lastLen + delta > MAX_TABLE_SIZE) {
            throw new RangeError('Failed to grow table by ' + delta);
        }
        if (typeof(this.maximum) !== 'undefined' && lastLen + delta > this.maximum) {
            throw new RangeError('Failed to grow table by ' + delta);
        }
        this.elements.push(...Array.from(Array(delta)).map(
            this.type === 'anyfunc' ?
            (_ => value || null) :
            (_ => value)
        ) as any);
        return lastLen;
    }
}

const valueTypes = [
    'anyfunc', 'externref',
    'f32', 'f64', 'i32', 'i64'
];
class KWGlobalPoly implements WebAssembly.Global {
    public _value: any;
    public readonly type!: WebAssembly.ValueType;
    public readonly mutable!: boolean;
    public get value(): any { return this._value; }
    public set value(value: any) {
        if (this.type === 'anyfunc') {
            if (!isValidAnyFunc(value)) {
                throw new TypeError('Value of an funcref reference must be either null or an exported function')
            }
        }
        else if (this.type !== 'externref') { value = Number(value) || 0; }
        this._value = value;
    }
    public constructor(descriptor: WebAssembly.GlobalDescriptor) {
        if (typeof(descriptor) !== 'object') {
            throw new TypeError('Argument 0 must be a table descriptor');
        }
        descriptor = Object.assign({}, descriptor);
        if (!valueTypes.includes(descriptor.value)) {
            throw new TypeError('Descriptor property \'value\' must be a WebAssembly type');
        }
        protect(this, 'type', descriptor.value);
        protect(this, 'mutable', !!descriptor.mutable);
        this._value = 0;
    }

    public valueOf(): any { return this._value; }
}

type TagDescriptor = { parameters: WebAssembly.ValueType[] }
class KWTagPoly {
    public readonly parameters!: WebAssembly.ValueType[];
    public constructor(descriptor: TagDescriptor) {
        if (typeof(descriptor) !== 'object') {
            throw new TypeError('Argument 0 must be a table descriptor');
        }
        descriptor = Object.assign({}, descriptor);
        if (!Array.isArray(descriptor.parameters)) {
            throw new TypeError('Argument 0 must be a tag type with \'parameters\'');
        }
        descriptor.parameters.forEach((d, i) => {
            if (!(d in valueTypes)) {
                throw new TypeError(
                    'Argument 0 parameter type at index #' + i +
                    ' must be a value type'
                );
            }
        });
        protect(this, 'parameters', descriptor.parameters);
    }
}

export class KWModule {
    public readonly target!: WebAssembly.Module
    public get imports(): WebAssembly.ModuleImportDescriptor[] { return modImports(this.target); }
    public get exports(): WebAssembly.ModuleExportDescriptor[] { return modExports(this.target); }
    public constructor(module: WebAssembly.Module) { protect(this, 'target', module); }
    public hasCustomSection(name: string): boolean { return !!this.customSection(name).length; }
    public customSection(name: string): ArrayBuffer[] { return customSections(this.target, name); }
    public send(worker: Worker): this {
        worker.postMessage(this.target);
        return this;
    }
    public instantiate(imports?: WebAssembly.Imports | undefined): Promise<KWInstance> {
        return VM.instantiate(this, imports).then(v => v.instance);
    }
}

export class KWInstance {
    public readonly module!: KWModule;
    public readonly target!: WebAssembly.Instance;
    public get imports(): WebAssembly.ModuleImportDescriptor[] { return this.module.imports; }
    public get exports(): WebAssembly.Exports { return this.target.exports; }
    public constructor(module: KWModule, instance: WebAssembly.Instance) {
        protect(this, 'module', module);
        protect(this, 'target', instance);
    }
    public hasCustomSection(name: string): boolean { return this.module.hasCustomSection(name); }
    public customSection(name: string): ArrayBuffer[] { return this.module.customSection(name); }
    public get<E extends WebAssembly.ExportValue>(name: string): E | null {
        return this.exports[name] as E || null;
    }
}

export class VM {
    public static compile(buffer: KWModuleInit): Promise<KWModule> {
        return compile(buffer).then(m => new KWModule(m));
    }

    public static instantiate(buffer: KWModuleInit | KWModule, imports?: WebAssembly.Imports | undefined): Promise<KWInstantiatedModule> {
        const kw = buffer instanceof KWModule;
        return instantiate(kw ? buffer.target : buffer, imports).then(v => {
            const module = kw ? buffer : new KWModule(v.module);
            return { module, instance: new KWInstance(module, v.instance) };
        });
    }
}