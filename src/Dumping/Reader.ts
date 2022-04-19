import { Type } from '../Types';
import { protect } from '../internal';
import { ExchangeDescriptionCode, SectionTypes } from '../Sections';
import { Decoder, IDecoder } from '../Encoding';

export type ReaderEvent<K extends keyof ReaderEventMap = keyof ReaderEventMap, V = any> = {
    index: number,
    data: Uint8Array,
    value: V,
    type: K,
    composite: boolean
}

export type Section = {
    type: SectionTypes,
    name: keyof typeof SectionTypes,
    size: number,
    data: any,
    unknown?: any
};
export type SectionTypeTypes = SectionTypeFunction | SectionTypeUnknown;
export type SectionTypeFunction = { params: Type[], results: Type[], index: number };
export type SectionTypeUnknown = { index: number, data: Uint8Array };
export type SectionImport = SectionExport & { module: string }
export type SectionExport = {
    name: string,
    type: number,
    index: number,
    kind: ExchangeDescriptionCode
}
export type SectionBody = {
    size: number,
    locals: number,
    index: number,
    instructions: Uint8Array,
}
export type SectionCustom<D = any> = { name: string, data: D }

export type ReaderEventMap = {
    error: Error,
    all: ReaderEvent,
    
    magic: ReaderEvent<'magic', string>,
    version: ReaderEvent<'version', string>,
    
    section: ReaderEvent<'section', Section>
    'section.start': ReaderEvent<'section.start', SectionTypes>,
    'section.size': ReaderEvent<'section.size', number>,

    'section.types': ReaderEvent<'section.types', SectionTypeTypes[]>,
    'section.types.size': ReaderEvent<'section.types.size', number>,
    'section.types.code': ReaderEvent<'section.types.code', Type>,
    'section.types.type': ReaderEvent<'section.types.type', SectionTypeTypes>,

    'section.types.function': ReaderEvent<'section.types.function', SectionTypeFunction>,
    'section.types.function.params': ReaderEvent<'section.types.function.params', number>,
    'section.types.function.param': ReaderEvent<'section.types.function.param', Type>,
    'section.types.function.results': ReaderEvent<'section.types.function.results', number>,
    'section.types.function.result': ReaderEvent<'section.types.function.result', Type>,

    'section.types.unknown': ReaderEvent<'section.types.unknown', SectionTypeUnknown>,

    'section.imports': ReaderEvent<'section.imports', SectionImport[]>,
    'section.imports.size': ReaderEvent<'section.imports.size', number>,
    'section.imports.import': ReaderEvent<'section.imports.import', SectionImport>,
    'section.imports.import.module.size': ReaderEvent<'section.imports.import.module.size', number>,
    'section.imports.import.module': ReaderEvent<'section.imports.import.module', string>,
    'section.imports.import.name.size': ReaderEvent<'section.imports.import.name.size', number>,
    'section.imports.import.name': ReaderEvent<'section.imports.import.name', string>,
    'section.imports.import.kind': ReaderEvent<'section.imports.import.kind', ExchangeDescriptionCode>,
    'section.imports.import.signature': ReaderEvent<'section.imports.import.signature', number>,

    'section.exports': ReaderEvent<'section.exports', SectionExport[]>,
    'section.exports.size': ReaderEvent<'section.exports.size', number>,
    'section.exports.export': ReaderEvent<'section.exports.export', SectionExport>,
    'section.exports.export.module.size': ReaderEvent<'section.exports.export.module.size', number>,
    'section.exports.export.module': ReaderEvent<'section.exports.export.module', string>,
    'section.exports.export.name.size': ReaderEvent<'section.exports.export.name.size', number>,
    'section.exports.export.name': ReaderEvent<'section.exports.export.name', string>,
    'section.exports.export.kind': ReaderEvent<'section.exports.export.kind', ExchangeDescriptionCode>,
    'section.exports.export.signature': ReaderEvent<'section.exports.export.signature', number>

    'section.functions': ReaderEvent<'section.functions', number[]>,
    'section.functions.size': ReaderEvent<'section.functions.size', number>,
    'section.functions.function': ReaderEvent<'section.functions.function', number>,

    'section.codes': ReaderEvent<'section.codes', SectionBody[]>,
    'section.codes.size': ReaderEvent<'section.codes.size', number>,
    'section.codes.code': ReaderEvent<'section.codes.code', SectionBody>,
    'section.codes.code.size': ReaderEvent<'section.codes.code.size', number>,
    'section.codes.code.locals': ReaderEvent<'section.codes.code.locals', number>,
    'section.codes.code.body': ReaderEvent<'section.codes.code.body', Uint8Array>,

    'section.custom': ReaderEvent<'section.custom', SectionCustom>,
    'section.custom.name': ReaderEvent<'section.custom.name', string>,
    'section.custom.name.size': ReaderEvent<'section.custom.name.size', number>,
    'section.custom.unknown': ReaderEvent<'section.custom.unknown', Uint8Array>,

    'section.unknown': ReaderEvent<'section.unknown', Uint8Array>
    'unknown': ReaderEvent<'unknown', Uint8Array>
}
type ReaderEventEsK = { [K in keyof ReaderEventMap]: ReaderEventMap[K] extends ReaderEvent ? K : never  }[keyof ReaderEventMap];
type ReaderEventValue<K extends ReaderEventEsK> = ReaderEventMap[K] extends ReaderEvent<K, infer E> ? E : never;
export type ReaderEventCallback<E> = (this: Reader, evt: E) => any

export class Reader {
    private readonly _handlers!: { [K in keyof ReaderEventMap]: ReaderEventCallback<ReaderEventMap[K]>[] };
    private readonly _decoder!: IDecoder;

    public constructor(buffer: Uint8Array | ArrayBuffer | IDecoder) {
        protect(this as any as { _handlers: any }, '_handlers', {});
        protect(this as any as { _decoder: IDecoder }, '_decoder',
             buffer instanceof ArrayBuffer ? new Decoder(buffer) :
             ArrayBuffer.isView(buffer) ? new Decoder(buffer.buffer) :
             buffer
        );
    }

    private _emit<K extends keyof ReaderEventMap>(type: K, event: ReaderEventMap[K]): this {
        if (type in this._handlers) { this._handlers[type].forEach(cb => (cb as any).call(this, event)); }
        if (type !== 'all' && type !== 'error') { this._emit('all', event as ReaderEvent<any>); }
        return this;
    }
    private _autoEmit<K extends ReaderEventEsK>(
        type: K,
        fn: () => ReaderEventValue<K>,
        composite: boolean = false
    ): ReaderEventValue<K> {
        const index = this._decoder.offset;
        const value = fn();
        const amount = this._decoder.offset - index;
        this._decoder.offset = index;
        const data = this._decoder.read(amount);
        this._emit(type, { data, index, value, type, composite } as any);
        return value;
    }

    private _parseMagic(): string {
        return this._autoEmit('magic', () => {
            const magic = this._decoder.utf8(4);
            if (magic !== '\0asm') { throw new Error('Invalid wasm binary magic: ' + magic); } 
            return magic;
        });
    }
    private _parseVersion(): string {
        return this._autoEmit('version', () => [
            this._decoder.uint8(),
            this._decoder.uint8(),
            this._decoder.uint8(),
            this._decoder.uint8()
        ].join('.'));
    }

    private _parseTypeFunc(index: number): SectionTypeFunction {
        return this._autoEmit('section.types.function', () => {
            const nParams = this._autoEmit('section.types.function.params', () => this._decoder.uint32());
            const params: Type[] = [];
            for (let p = 0; p < nParams; ++p) {
                params.push(this._autoEmit('section.types.function.param', () => this._decoder.uint8()));
            }
            const nResults = this._autoEmit('section.types.function.results', () => this._decoder.uint32());
            const results: Type[] = [];
            for (let r = 0; r < nResults; ++r) {
                results.push(this._autoEmit('section.types.function.result', () => this._decoder.uint8()));
            }
            return { params, results, index };
        }, true);
    }
    private _parseTypeUnknown(index: number): SectionTypeUnknown {
        return this._autoEmit('section.types.unknown', () => ({
            index,
            data: this._decoder.read(this._decoder.remaining)
        }));
    }
    private _parseType(index: number): SectionTypeTypes {
        return this._autoEmit('section.types.type', () => {
            const code = this._autoEmit('section.types.code', () => this._decoder.uint8());
            switch (code!) {
                case Type.func: return this._parseTypeFunc(index);
                default: return this._parseTypeUnknown(index);
            }
        }, true);
    }
    private _parseSectionType(): SectionTypeTypes[] {
        return this._autoEmit('section.types', () => {
            const nTypes = this._autoEmit('section.types.size', () => this._decoder.uint32());
            const types: SectionTypeTypes[] = [];
            for (let i = 0; i < nTypes; ++i) { types.push(this._parseType(i)); }
            return types;
        }, true);
    }

    private _parseImport(index: number): SectionImport {
        return this._autoEmit('section.imports.import', () => {
            const modLen = this._autoEmit('section.imports.import.module.size', () => this._decoder.uint32());
            const module = this._autoEmit('section.imports.import.module', () => this._decoder.string(modLen));
            const namLen = this._autoEmit('section.imports.import.name.size', () => this._decoder.uint32());
            const name = this._autoEmit('section.imports.import.name', () => this._decoder.string(namLen));
            const kind = this._autoEmit('section.imports.import.kind', () => this._decoder.uint8());
            const type = this._autoEmit('section.imports.import.signature', () => this._decoder.uint32());
            return { module, name, kind, type, index };
        }, true)
    }
    private _parseSectionImport(): SectionImport[] {
        return this._autoEmit('section.imports', () => {
            const nImports = this._autoEmit('section.imports.size', () => this._decoder.uint32());
            const imports: SectionImport[] = [];
            for (let i = 0; i < nImports; ++i) { imports.push(this._parseImport(i)); }
            return imports;
        }, true);
    }

    private _parseSectionFunction(): number[] {
        return this._autoEmit('section.functions', () => {
            const nFuncs = this._autoEmit('section.functions.size', () => this._decoder.uint32());
            const functions: number[] = [];
            for (let i = 0; i < nFuncs; ++i) {
                functions.push(this._autoEmit('section.functions.function', () => this._decoder.uint32()));
            }
            return functions;
        }, true);
    }

    private _parseExport(index: number): SectionExport {
        return this._autoEmit('section.exports.export', () => {
            const namLen = this._autoEmit('section.exports.export.name.size', () => this._decoder.uint32());
            const name = this._autoEmit('section.exports.export.name', () => this._decoder.string(namLen));
            const kind = this._autoEmit('section.exports.export.kind', () => this._decoder.uint8());
            const type = this._autoEmit('section.exports.export.signature', () => this._decoder.uint32());
            return { module, name, kind, type, index };
        }, true)
    }
    private _parseSectionExport(): SectionExport[] {
        return this._autoEmit('section.exports', () => {
            const nImports = this._autoEmit('section.exports.size', () => this._decoder.uint32());
            const exports: SectionExport[] = [];
            for (let i = 0; i < nImports; ++i) { exports.push(this._parseExport(i)); }
            return exports;
        }, true);
    }

    private _parseFunctionBody(index: number): any {
        return this._autoEmit('section.codes.code', () => {
            const size = this._autoEmit('section.codes.code.size', () => this._decoder.uint32());
            const locals = this._autoEmit('section.codes.code.locals', () => this._decoder.uint32());
            const instructions = this._autoEmit('section.codes.code.body', () => this._decoder.read(this._decoder.remaining));
            return { size, locals, instructions, index };
        }, true);
    }
    private _parseSectionCode(): any {
        return this._autoEmit('section.codes', () => {
            const nBodies = this._autoEmit('section.codes.size', () => this._decoder.uint32());
            const bodies = [];
            for (let i = 0; i < nBodies; ++i) {
                bodies.push(this._parseFunctionBody(i));
            }
            return bodies;
        }, true);
    }
    private _parseSectionCustom(): any {
        return this._autoEmit('section.custom', () => {
            const namLen = this._autoEmit('section.custom.name.size', () => this._decoder.uint32());
            const name = this._autoEmit('section.custom.name', () => this._decoder.string(namLen));
            const method = '_parseSectionCustom_' + (name || '').toLowerCase();
            const result: SectionCustom = { name, data: null }
            if (method in this && typeof((this as any)[method]) === 'function') { result.data = (this as any)[method](this._decoder); }
            else { result.data = this._autoEmit('section.custom.unknown', () => this._decoder.read(this._decoder.remaining)); }
            return result;
        }, true);
    }
    private _parseSectionUnknown(): any {
        return this._autoEmit('section.unknown', () => this._decoder.read(this._decoder.remaining));
    }

    private _parseSection(): Section {
        const code = this._autoEmit('section.start', () => this._decoder.uint8());
        const size = this._autoEmit('section.size', () => this._decoder.uint32());
        const section = this._autoEmit('section', () => {
            let data: any;
            switch (code) {
                case SectionTypes.type: data = this._parseSectionType(); break;
                case SectionTypes.import: data = this._parseSectionImport(); break;
                case SectionTypes.function: data = this._parseSectionFunction(); break;
                case SectionTypes.export: data = this._parseSectionExport(); break;
                case SectionTypes.code: data = this._parseSectionCode(); break;
                case SectionTypes.custom: data = this._parseSectionCustom(); break;
                default: data = this._parseSectionUnknown(); break;
            }
            return {
                size,
                type: code,
                name: SectionTypes[code]! as keyof typeof SectionTypes,
                data: data
            };
        }, true);
        if (this._decoder.remaining) {
            section.unknown = this._autoEmit('unknown', () => this._decoder.read(this._decoder.remaining));
        }
        return section;
    }

    public read(): this {
        this._decoder.offset = 0;
        try {
            this._parseMagic();
            this._parseVersion();
            while (this._decoder.remaining) {
                this._parseSection();
            }
        }
        catch (ex) { this._emit('error', ex instanceof Error ? ex : new Error(ex + '')); }
        return this;
    }

    public on<K extends keyof ReaderEventMap>(type: K, handler: ReaderEventCallback<ReaderEventMap[K]>): this {
        if (typeof(handler) === 'function') {
            if (!(type in this._handlers)) { this._handlers[type] = []; }
            this._handlers[type].push(handler as any);
        }
        return this;
    }

    public off<K extends keyof ReaderEventMap>(type: K, handler?: ReaderEventCallback<ReaderEventMap[K]>): this {
        if (type in this._handlers) {
            const hs: ReaderEventCallback<any>[] = this._handlers[type];
            if (typeof(handler) === 'function') {
                this._handlers[type] = hs.filter(h => h !== handler) as any;
            }
            else if (typeof(handler) === 'undefined') { hs.length = 0; }
        }
        return this;
    }
}