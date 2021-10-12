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

import { Type } from '../Types';
import { protect } from '../internal';
import { KWatError } from '../errors';
import { Decoder, IDecoder } from '../Encoding';
import { Expression, ExpressionReader, ExpressionReaderEvent } from './ExpressionReader';
import { ExchangeDescriptionCode, SectionTypes } from '../Sections';

export type GenericReaderEvent = {
    id: string,
    index: number,
    data: Uint8Array,
    composite: boolean,
    textualValue: string | null,
    description: string,
    type: string,
    value: any
}
export type ReaderEvent<K extends keyof ReaderEventMap = keyof ReaderEventMap, V = any> = {
    value: V,
    type: K
} & GenericReaderEvent;

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
type SectionExchange = {
    name: string,
    index: number,
    kind: ExchangeDescriptionCode
};
export type SectionImport = SectionExchange & { declaration: ExchangeableType, module: string }
export type SectionExport = SectionExchange & { reference: number }
export type SectionBody = {
    size: number,
    locals: Type[],
    index: number,
    instructions: Expression,
}
export type SectionCustom<D = any> = { name: string, data: D }

export type GlobalVar = {
    mutable: boolean,
    type: number
}
export type GlobalVarDecl = GlobalVar & {
    init: Expression
}
export type Table = Memory & { type: number };
export type Memory = {
    min: number,
    max: number | null
}
export type ExchangeableType = number | Memory | Table | GlobalVar;

export type Data = {
    active: boolean,
    memory: number | null,
    offset: Expression | null,
    data: Uint8Array,
}

export type ElementMode = 'passive' | 'active' | 'declarative';
export type Element<M extends ElementMode = ElementMode> = {
    type: Type,
    init: Expression[],
    mode: M,
    table: M extends 'active' ? number : null,
    offset: M extends 'active' ? Expression : null,
}

export type ReaderEventMap = {
    error: { error: Error, index: number },
    all: ReaderEvent,
    
    magic: ReaderEvent<'magic', string>,
    version: ReaderEvent<'version', string>,
    
    section: ReaderEvent<'section', Section>
    'section.code': ReaderEvent<'section.code', SectionTypes>,
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
    'section.imports.import.code': ReaderEvent<'section.imports.import.code', ExchangeDescriptionCode>,
    'section.imports.import.declaration': ReaderEvent<'section.imports.import.declaration', ExchangeableType>,
    'section.imports.import.declaration.signature': ReaderEvent<'section.imports.import.declaration.signature', number>,
    'section.imports.import.declaration.table': ReaderEvent<'section.imports.import.declaration.table', Table>,
    'section.imports.import.declaration.table.min': ReaderEvent<'section.imports.import.declaration.table.min', number>,
    'section.imports.import.declaration.table.hasMax': ReaderEvent<'section.imports.import.declaration.table.hasMax', boolean>,
    'section.imports.import.declaration.table.max': ReaderEvent<'section.imports.import.declaration.table.max', number>,
    'section.imports.import.declaration.table.type': ReaderEvent<'section.imports.import.declaration.table.type', number>,
    'section.imports.import.declaration.memory': ReaderEvent<'section.imports.import.declaration.memory', Memory>,
    'section.imports.import.declaration.memory.min': ReaderEvent<'section.imports.import.declaration.memory.min', number>,
    'section.imports.import.declaration.memory.hasMax': ReaderEvent<'section.imports.import.declaration.memory.hasMax', boolean>,
    'section.imports.import.declaration.memory.max': ReaderEvent<'section.imports.import.declaration.memory.max', number>,
    'section.imports.import.declaration.global': ReaderEvent<'section.imports.import.declaration.global', GlobalVar>,
    'section.imports.import.declaration.global.mutable': ReaderEvent<'section.imports.import.declaration.global.mutable', boolean>,
    'section.imports.import.declaration.global.type': ReaderEvent<'section.imports.import.declaration.global.type', number>,

    'section.exports': ReaderEvent<'section.exports', SectionExport[]>,
    'section.exports.size': ReaderEvent<'section.exports.size', number>,
    'section.exports.export': ReaderEvent<'section.exports.export', SectionExport>,
    'section.exports.export.module.size': ReaderEvent<'section.exports.export.module.size', number>,
    'section.exports.export.module': ReaderEvent<'section.exports.export.module', string>,
    'section.exports.export.name.size': ReaderEvent<'section.exports.export.name.size', number>,
    'section.exports.export.name': ReaderEvent<'section.exports.export.name', string>,
    'section.exports.export.code': ReaderEvent<'section.exports.export.code', ExchangeDescriptionCode>,
    'section.exports.export.reference': ReaderEvent<'section.exports.export.reference', number>,

    'section.functions': ReaderEvent<'section.functions', number[]>,
    'section.functions.size': ReaderEvent<'section.functions.size', number>,
    'section.functions.function': ReaderEvent<'section.functions.function', number>,

    'section.codes': ReaderEvent<'section.codes', SectionBody[]>,
    'section.codes.size': ReaderEvent<'section.codes.size', number>,
    'section.codes.function': ReaderEvent<'section.codes.function', SectionBody>,
    'section.codes.function.size': ReaderEvent<'section.codes.function.size', number>,
    'section.codes.function.locals': ReaderEvent<'section.codes.function.locals', Type[]>,
    'section.codes.function.locals.local': ReaderEvent<'section.codes.function.locals.local', { type: Type, amount: number }>,
    'section.codes.function.locals.local.amount': ReaderEvent<'section.codes.function.locals.local.amount', number>,
    'section.codes.function.locals.local.type': ReaderEvent<'section.codes.function.locals.local.type', Type>,
    'section.codes.function.locals.size': ReaderEvent<'section.codes.function.locals.size', number>,
    'section.codes.function.body': ReaderEvent<'section.codes.function.body', Expression>,

    'section.memories': ReaderEvent<'section.memories', Memory[]>,
    'section.memories.size': ReaderEvent<'section.memories.size', number>,
    'section.memories.memory': ReaderEvent<'section.memories.memory', Memory>,
    'section.memories.memory.hasMax': ReaderEvent<'section.memories.memory.hasMax', boolean>,
    'section.memories.memory.min': ReaderEvent<'section.memories.memory.min', number>,
    'section.memories.memory.max': ReaderEvent<'section.memories.memory.max', number>,

    'section.datas': ReaderEvent<'section.datas', Data[]>,
    'section.datas.size': ReaderEvent<'section.datas.size', number>,
    'section.datas.data': ReaderEvent<'section.datas.data', Data>,
    'section.datas.data.size': ReaderEvent<'section.datas.data.size', number>,
    'section.datas.data.active': ReaderEvent<'section.datas.data.active', boolean>,
    'section.datas.data.memory': ReaderEvent<'section.datas.data.memory', number>,
    'section.datas.data.offset': ReaderEvent<'section.datas.data.offset', Expression>,
    'section.datas.data.data': ReaderEvent<'section.datas.data.data', Uint8Array>,

    'section.elements': ReaderEvent<'section.elements', Element[]>,
    'section.elements.size': ReaderEvent<'section.elements.size', number>,
    'section.elements.element': ReaderEvent<'section.elements.element', Element>,
    'section.elements.element.mode': ReaderEvent<'section.elements.element.mode', ElementMode>,
    'section.elements.element.table': ReaderEvent<'section.elements.element.table', number>,
    'section.elements.element.offset': ReaderEvent<'section.elements.element.offset', Expression>,
    'section.elements.element.type': ReaderEvent<'section.elements.element.type', Type>,
    'section.elements.element.inits': ReaderEvent<'section.elements.element.inits', Expression[]>,
    'section.elements.element.inits.size': ReaderEvent<'section.elements.element.inits.size', number>,
    'section.elements.element.inits.init': ReaderEvent<'section.elements.element.inits.init', Expression | number>,
    
    'section.globals': ReaderEvent<'section.globals', GlobalVarDecl[]>,
    'section.globals.size': ReaderEvent<'section.globals.size', number>,
    'section.globals.global': ReaderEvent<'section.globals.global', GlobalVarDecl>,
    'section.globals.global.type': ReaderEvent<'section.globals.global.type', Type>,
    'section.globals.global.mutable': ReaderEvent<'section.globals.global.mutable', boolean>,
    'section.globals.global.init': ReaderEvent<'section.globals.global.init', Expression>,

    'section.tables': ReaderEvent<'section.tables', Table[]>,
    'section.tables.size': ReaderEvent<'section.tables.size', number>,
    'section.tables.table': ReaderEvent<'section.tables.table', Table>,
    'section.tables.table.type': ReaderEvent<'section.tables.table.type', Type>,
    'section.tables.table.hasMax': ReaderEvent<'section.tables.table.hasMax', boolean>,
    'section.tables.table.min': ReaderEvent<'section.tables.table.min', number>,
    'section.tables.table.max': ReaderEvent<'section.tables.table.max', number>,

    'section.datacount': ReaderEvent<'section.datacount', number>,
    'section.start': ReaderEvent<'section.start', number>,

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

function sectionTypeToPlural(type: SectionTypes | string): string {
    let s: string;
    if (typeof(type) === 'string') { s = type; }
    else {
        if (!(type in SectionTypes)) { return 'unknown'; }
        s = SectionTypes[type]!;
    }
    if (s.endsWith('y')) { s = s.substring(0, s.length - 1) + 'ies'; }
    else { s += 's'; }
    return s;
}

export class Reader {
    private readonly _startOffset!: number;
    private readonly _handlers!: { [K in keyof ReaderEventMap]: ReaderEventCallback<ReaderEventMap[K]>[] };
    private readonly _decoder!: IDecoder;

    public constructor(buffer: Uint8Array | ArrayBuffer | IDecoder) {
        protect(this as any as { _handlers: any }, '_handlers', {});
        protect(this as any as { _decoder: IDecoder }, '_decoder',
             buffer instanceof ArrayBuffer ? new Decoder(buffer) :
             ArrayBuffer.isView(buffer) ? new Decoder(buffer.buffer) :
             buffer
        );
        protect(this as any as { _startOffset: number }, '_startOffset', this._decoder.offset);
    }

    private _u_emit(type: string, event: any): this { return this._emit(type as any, event); }
    private _emit<K extends keyof ReaderEventMap>(type: K, event: ReaderEventMap[K]): this {
        if (type in this._handlers) { this._handlers[type].forEach(cb => (cb as any).call(this, event)); }
        if (type !== 'all' && type !== 'error') { this._emit('all', event as ReaderEvent<any>); }
        return this;
    }
    private _u_autoEmit<T>(
        type: string,
        fn: () => T,
        id: string | ((v: T) => string),
        description?: string | null | ((v: T) => string | null),
        enumeration?: string | Record<any, any> | null | ((v: T) => string),
        composite: boolean = false
    ): T { return (this._autoEmit as any)(type as any, fn, id, description, enumeration, composite); }
    private _autoEmit<K extends ReaderEventEsK>(
        type: K,
        fn: () => ReaderEventValue<K>,
        id: string | ((v: ReaderEventValue<K>) => string),
        description?: string | null | ((v: ReaderEventValue<K>) => string | null),
        enumeration?: string | Record<any, any> | null | ((v: ReaderEventValue<K>) => string),
        composite: boolean = false
    ): ReaderEventValue<K> {
        const index = this._decoder.offset;
        const value = fn();
        const amount = this._decoder.offset - index;
        this._decoder.offset = index;
        const data = this._decoder.read(amount);
        const textualValue = typeof(enumeration) === 'function' ? enumeration(value) :
                             typeof(enumeration) === 'string' ? enumeration :
                             enumeration ? (enumeration[value] + '') :
                             null;
        description = ((typeof(description) === 'function' ? description(value) : description) || '') + '';
        id = (typeof(id) === 'function' ? id(value) : id) + '';
        this._emit(type, { data, index, value, type, composite, textualValue, description, id } as any);
        return value;
    }

    private _parseMagic(): string {
        return this._autoEmit('magic', () => {
            const magic = this._decoder.utf8(4);
            if (magic !== '\0asm') { throw new KWatError('Invalid wasm binary magic: ' + magic); } 
            return magic;
        }, 'magic', 'The encoding of a module starts with a preamble containing a 4-byte magic number (the string \'\\0asm\')', '\\0asm');
    }

    private _parseVersion(): string {
        return this._autoEmit('version', () => [
                this._decoder.uint8(),
                this._decoder.uint8(),
                this._decoder.uint8(),
                this._decoder.uint8()
            ].join('.'),
            'version',
            'The encoding of a module starts with a preamble with a version field (little endian). The current version of the WebAssembly binary format is 1.0.0.0'
        );
    }

    private _emitExpression(
        parent: string,
        parentId: string,
        expression: ExpressionReaderEvent,
        desc?: string
    ) {
        this._u_emit(parent + '.' + expression.type, {
            id: parentId + '.' + expression.id,
            index: expression.index,
            data: expression.data,
            value: expression.value,
            type: parent + '.' + expression.type,
            composite: expression.composite,
            textualValue: expression.textualValue,
            description: expression.type === 'expression' && desc ?
                            desc : expression.description
        })
        return expression;
    }

    private _parseExpression(
        parent: string,
        parentId: string,
        desc: string
    ): Expression {
        const exp = new ExpressionReader(this._decoder);
        let res: Expression;
        exp.on('all', e => this._emitExpression(parent, parentId, e, desc));
        exp.on('expression', e => res = e.value);
        exp.on('error', e => this._emit('error', e));
        exp.read();
        return res!;
    }

    private _parseTypeFunc(index: number): SectionTypeFunction {
        return this._autoEmit('section.types.function', () => {
                const nParams = this._autoEmit(
                    'section.types.function.params',
                    () => this._decoder.uint32(),
                    'sections.types[' + index + ']<func>.params.length',
                    'The number of the parameters of the function'
                );
                const params: Type[] = [];
                for (let p = 0; p < nParams; ++p) {
                    params.push(this._autoEmit(
                        'section.types.function.param',
                        () => this._decoder.uint8(),
                        'sections.types[' + index + ']<func>.params[' + p +']',
                        'The type of the current parameter',
                        Type
                    ));
                }
                const nResults = this._autoEmit(
                    'section.types.function.results',
                    () => this._decoder.uint32(),
                    'sections.types[' + index + ']<func>.results.length',
                    'The number of the results of the current function (types[' + index + '])'
                );
                const results: Type[] = [];
                for (let r = 0; r < nResults; ++r) {
                    results.push(this._autoEmit(
                        'section.types.function.result',
                        () => this._decoder.uint8(),
                        'sections.types[' + index + ']<func>.results[' + r +']',
                        'The type of the current result',
                        Type
                    ));
                }
                return { params, results, index };
            },
            'sections.types[' + index + ']<func>',
            'A declared function type, a signature of one or more declared functions in the module',
            null, true
        );
    }
    private _parseTypeUnknown(index: number): SectionTypeUnknown {
        return this._autoEmit('section.types.unknown', () => ({
                index,
                data: this._decoder.read(this._decoder.remaining)
            }),
            'sections.types[' + index + ']<unk>',
            'An unexpected type declaration #types[' + index + ']'
        );
    }
    private _parseType(index: number): SectionTypeTypes {
        return this._autoEmit('section.types.type', () => {
                const code = this._autoEmit(
                    'section.types.code',
                    () => this._decoder.uint8(),
                    'sections.types[' + index + '].type',
                    'The kind of the current declared type',
                    Type
                );
                switch (code!) {
                    case Type.func: return this._parseTypeFunc(index);
                    default: return this._parseTypeUnknown(index);
                }
            },
            'sections.types[' + index + ']',
            'The declared type, actually can be just a function type',
            null, true
        );
    }
    protected _parseSection_type(): SectionTypeTypes[] {
        return this._autoEmit('section.types', () => {
            const nTypes = this._autoEmit(
                'section.types.size',
                () => this._decoder.uint32(),
                'sections.types.length',
                'The number of declared types in this module'
            );
            const types: SectionTypeTypes[] = [];
            for (let i = 0; i < nTypes; ++i) { types.push(this._parseType(i)); }
            return types;
        },
        'sections.types',
        'The type section which includes the signature definitions of declared functions in the module',
        null, true
        );
    }

    private _parseImport(index: number): SectionImport {
        return this._autoEmit('section.imports.import', () => {
                const modLen = this._autoEmit(
                    'section.imports.import.module.size',
                    () => this._decoder.uint32(),
                    'sections.imports[' + index + '].module.length',
                    'The length of the imported module name string'
                );
                const module = this._autoEmit(
                    'section.imports.import.module',
                    () => this._decoder.string(modLen),
                    'sections.imports[' + index + '].module',
                    'The imported module name #imports'
                );
                const namLen = this._autoEmit(
                    'section.imports.import.name.size',
                    () => this._decoder.uint32(),
                    'sections.imports[' + index + '].name.length',
                    'The length of the imported entity name string'
                );
                const name = this._autoEmit(
                    'section.imports.import.name',
                    () => this._decoder.string(namLen),
                    'sections.imports[' + index + '].name',
                    'The imported entity name'
                );
                const kind = this._autoEmit(
                    'section.imports.import.code',
                    () => this._decoder.uint8(),
                    'sections.imports[' + index + '].kind',
                    'The imported entity exchange kind',
                    ExchangeDescriptionCode
                );
                const declaration = this._autoEmit(
                    'section.imports.import.declaration',
                    () => {
                        switch (kind) {
                            case ExchangeDescriptionCode.function:
                                return this._autoEmit(
                                    'section.imports.import.declaration',
                                    () => this._decoder.uint32(),
                                    'sections.imports[' + index + '].declaration<func>',
                                    i => 'The signature index referencing the type section (#sections.types[' + i + '])'
                                );
                            case ExchangeDescriptionCode.table:
                                return this._autoEmit('section.imports.import.declaration', () => {
                                    const type = this._autoEmit(
                                        'section.imports.import.declaration.table.type',
                                        () => this._decoder.uint8(),
                                        'sections.imports[' + index + '].declaration<table>.type',
                                        'The element type of the table',
                                        Type
                                    );
                                    const hasMax = this._autoEmit(
                                        'section.imports.import.declaration.table.hasMax',
                                        () => !!this._decoder.uint8(),
                                        'sections.imports[' + index + '].declaration<table>.hasMax',
                                        'Wheter the maximum capacity of the table is set or not'
                                    );
                                    const min = this._autoEmit(
                                        'section.imports.import.declaration.table.min',
                                        () => this._decoder.uint32(),
                                        'sections.imports[' + index + '].declaration<table>.min',
                                        'The minimum memory size required by the table (expressed in pages)'
                                    )
                                    
                                    const max = hasMax ? this._autoEmit(
                                        'section.imports.import.declaration.table.max',
                                        () => this._decoder.uint32(),
                                        'sections.imports[' + index + '].declaration<table>.max',
                                        'The maximum memory size availiable for the table (expressed in pages)'
                                    ) : null;
                                    
                                    return { type, min, max };
                                },
                                'sections.imports[' + index + '].declaration<table>',
                                'An imported table',
                                null, true
                            );
                            case ExchangeDescriptionCode.memory:
                                return this._autoEmit(
                                    'section.imports.import.declaration.memory',
                                    () => {
                                        const hasMax = this._autoEmit(
                                            'section.imports.import.declaration.memory.hasMax',
                                            () => !!this._decoder.uint8(),
                                            'sections.imports[' + index + '].declaration<memory>.hasMax',
                                            'Wheter the maximum capacity of the memory slot is set or not'
                                        );
                                        const min = this._autoEmit(
                                            'section.imports.import.declaration.memory.min',
                                            () => this._decoder.uint32(),
                                            'sections.imports[' + index + '].declaration<memory>.min',
                                            'The minimum memory size required by the memory slot (expressed in pages)'
                                        )
                                        
                                        const max = hasMax ? this._autoEmit(
                                            'section.imports.import.declaration.memory.max',
                                            () => this._decoder.uint32(),
                                            'sections.imports[' + index + '].declaration<memory>.max',
                                            'The maximum memory size availiable for the memory slot (expressed in pages)'
                                        ) : null;
                                        return { min, max };
                                    },
                                    'sections.imports[' + index + '].declaration<memory>',
                                    'An imported memory slot', null, true
                                );
                            case ExchangeDescriptionCode.global:
                                return this._autoEmit(
                                    'section.imports.import.declaration.global',
                                    () => {
                                        const type = this._autoEmit(
                                            'section.imports.import.declaration.global.type',
                                            () => this._decoder.uint8(),
                                            'sections.imports[' + index + '].declaration<global>.type',
                                            'The type of the global variable', Type
                                        )
                                        const mutable = this._autoEmit(
                                            'section.imports.import.declaration.global.mutable',
                                            () => !!this._decoder.uint8(),
                                            'sections.imports[' + index + '].declaration<global>.mutable',
                                            'Whether the global variable is mutable or not'
                                        );
                                        return { type, mutable }
                                    },
                                    'sections.imports[' + index + '].declaration<global>',
                                
                                    'An imported global variable',
                                    null, true
                                )
                        }
                    },
                    'sections.imports[' + index + '].declaration',
                    'An import declaration', null, true
                )
                return { module, name, kind, index, declaration };
            },
            'sections.imports[' + index + ']',
            'An import statement including the module reference name, the element name and its declaration, which can be a function, a memory, a table or a global variable',
            null, true
        );
    }
    protected _parseSection_import(): SectionImport[] {
        return this._autoEmit('section.imports', () => {
                const nImports = this._autoEmit(
                    'section.imports.size',
                    () => this._decoder.uint32(),
                    'sections.imports.length',
                    'The number of imported entities'
                );
                const imports: SectionImport[] = [];
                for (let i = 0; i < nImports; ++i) { imports.push(this._parseImport(i)); }
                return imports;
            },
            'sections.imports',
            'The import section, includes the module, the name and the declaration of the imported elements in the current module',
            null, true
        );
    }

    protected _parseSection_function(): number[] {
        return this._autoEmit('section.functions', () => {
            const nFuncs = this._autoEmit('section.functions.size', () => this._decoder.uint32(), 'sections.functions.length', 'The number of functions declared in this module');
            const functions: number[] = [];
            for (let i = 0; i < nFuncs; ++i) {
                functions.push(this._autoEmit(
                    'section.functions.function',
                    () => this._decoder.uint32(),
                    'sections.functions[' + i + ']',
                    i => 'The signature index referencing the type section (#sections.types[' + i + '])'
                ));
            }
            return functions;
        }, 'sections.functions', null, null, true);
    }

    private _parseExport(index: number): SectionExport {
        const sid = 'sections.exports[' + index + ']';
        return this._autoEmit('section.exports.export', () => {
            const namLen = this._autoEmit(
                'section.exports.export.name.size',
                () => this._decoder.uint32(),
                sid + '.name.length',
                'The character length of exported entity name'
            );
            const name = this._autoEmit(
                'section.exports.export.name',
                () => this._decoder.string(namLen),
                sid + '.name',
                'The name of the exported entity'
            );
            const kind = this._autoEmit(
                'section.exports.export.code',
                () => this._decoder.uint8(),
                sid + '.kind',
                'The kind of exported entity',
                ExchangeDescriptionCode
            );
            const reference = this._autoEmit(
                'section.exports.export.reference',
                () => this._decoder.uint32(),
                'sections.exports[' + index + ']',
                v => 'The index of the exported element in the corrispective section (#sections.' +
                        sectionTypeToPlural(ExchangeDescriptionCode[kind] + '') + '[' + v + '])'
            );
            return { name, kind, reference, index };
        }, sid, 
        'An export statement including the element name and its declaration, which can be a function, a memory, a table or a global variable',
        null, true)
    }
    protected _parseSection_export(): SectionExport[] {
        return this._autoEmit('section.exports', () => {
            const nExports = this._autoEmit('section.exports.size', () => this._decoder.uint32(), 'sections.exports.length');
            const exports: SectionExport[] = [];
            for (let i = 0; i < nExports; ++i) { exports.push(this._parseExport(i)); }
            return exports;
        }, 'sections.exports', null, null, true);
    }

    private _parseFunctionBody(index: number): SectionBody {
        const sid = 'sections.codes[' + index + ']';
        const ref = ' (#sections.functions[' + index + '])';
        return this._autoEmit('section.codes.function', () => {
            const size = this._autoEmit(
                'section.codes.function.size',
                () => this._decoder.uint32(),
                sid + '.size',
                'The byte size of the body of the current function' + ref
            );
            const nLocals = this._autoEmit(
                'section.codes.function.locals.size',
                () => this._decoder.uint32(),
                sid + '.locals',
                'The number of local variables types of the current function' + ref
            );
            const locals = this._autoEmit(
                'section.codes.function.locals',
                () => {
                    let l: Type[] = [];
                    for (let i = 0; i < nLocals; ++i) {
                        const off = this._decoder.offset;
                        const amount = this._decoder.uint32();
                        const type = this._decoder.uint8();
                        const typeStr = Type[type] || 'unknown';
                        this._decoder.offset = off;

                        this._autoEmit(
                            'section.codes.function.locals.local',
                            () => {
                                this._autoEmit(
                                    'section.codes.function.locals.local.amount',
                                    () => this._decoder.uint32(),
                                    sid + '.locals[' + i + ']<' + typeStr + '>.amount',
                                    'The amount of local variables of the given type'
                                );
                                this._autoEmit(
                                    'section.codes.function.locals.local.type',
                                    () => this._decoder.uint8(),
                                    sid + '.locals[' + i + ']<' + typeStr + '>.type',
                                    'The type of the local variables precendetly counted',
                                    Type
                                );
                                for (let j = 0; j < amount; ++j) { l.push(type); }
                                return { type, amount };
                            },
                            sid + '.locals[' + i + ']<' + typeStr + '>',
                            'A set of local variable descriptors',
                            null, true
                        );
                    }
                    return l;
                },
                sid + '.locals',
                'The local variable declared in the body',
                null, true
            );
            const instructions = this._autoEmit(
                'section.codes.function.body',
                () => this._parseExpression(
                    'section.codes.function.body',
                    sid + '.body',
                    'The instructions that compose the body of the function'
                ),
                sid + '.body',
                'The actual set of instructions in the body of the current function' + ref,
                null, true
            );
            return { size, locals, instructions, index };
        }, sid, 'The body of the declared function' + ref, null, true);
    }

    protected _parseSection_code(): SectionBody[] {
        return this._autoEmit('section.codes', () => {
                const nBodies = this._autoEmit(
                    'section.codes.size',
                    () => this._decoder.uint32(),
                    'sections.codes.length',
                    'The number of defined bodies in the module (must correspond to the same number of declared functions)'
                );
                const bodies: SectionBody[] = [];
                for (let i = 0; i < nBodies; ++i) {
                    bodies.push(this._parseFunctionBody(i));
                }
                return bodies;
            },
            'sections.codes',
            'The section which contains all the declared function bodies',
            null, true
        );
    }

    protected _parseSection_memory(): Memory[] {
        return this._autoEmit(
            'section.memories',
            () => {
                const nMems = this._autoEmit(
                    'section.memories.size',
                    () => this._decoder.uint32(),
                    'sections.memories.length',
                    'The number of defined memories (Note: Wasm v1 introduces only 1 memory without extensions)'
                );
                const res: Memory[] = [];
                for (let i = 0; i < nMems; ++i) {
                    res.push(this._autoEmit(
                        'section.memories.memory',
                        () => {
                            const hasMax = this._autoEmit(
                                'section.memories.memory.hasMax',
                                () => !!this._decoder.uint8(),
                                'sections.memories[' + i + '].hasMax',
                                'Wheter the maximum capacity of the memory slot is set or not'
                            );
                            const min = this._autoEmit(
                                'section.memories.memory.min',
                                () => this._decoder.uint32(),
                                'sections.memories[' + i + '].min',
                                'The minimum memory size required by the memory slot (expressed in pages)'
                            )
                            
                            const max = hasMax ? this._autoEmit(
                                'section.memories.memory.max',
                                () => this._decoder.uint32(),
                                'sections.memories[' + i + '].max',
                                'The maximum memory size availiable for the memory slot (expressed in pages)'
                            ) : null;
                            return { min, max }
                        },
                        'sections.memories[' + i + ']',
                        'A memory declaration',
                        null, true
                    ));
                }
                return res;
            },
            'sections.memories',
            'The section where all the memories are declared (exluding imported memories)',
            null, true
        )
    }

    private _parseData(index: number): Data {
        const sid = 'sections.datas[' + index + ']';
        let v: number = -1;
        const res: Data = { memory: null, offset: null } as any;
        res.active = this._autoEmit(
            'section.datas.data.active',
            () => (v = this._decoder.uint8()) !== 0x01,
            sid + '.active',
            'If the data segment is active it will be copied as soon as the module is instantiated. ' +
            'Otherwise it will be needed to call memory.init instruction'
        );
        if (res.active) {
            if (v) {
                res.memory = this._autoEmit(
                    'section.datas.data.memory',
                    () => this._decoder.uint32(),
                    sid + '.memory',
                    v => 'The index of the referenced memory (#sections.memories[' + v + '])'
                );
            }
            res.offset = this._autoEmit(
                'section.datas.data.offset',
                () => this._parseExpression(
                    'section.datas.data.offset',
                    sid + '.offset',
                    'Instructions that express the offset computation'
                ),
                sid + '.offset',
                'The offset where to store the data in the target memory' +
                (res.memory !== null ? (' (#sections.memories[' + res.memory + '])') : '' ),
                null, true
            );
        }
        const dataSize = this._autoEmit(
            'section.datas.data.size',
            () => this._decoder.uint32(),
            sid + '.size',
            'The byte size of the data present in the current segment'
        )
        res.data = this._autoEmit(
            'section.datas.data.data',
            () => this._decoder.read(dataSize),
            sid + '.data',
            'The data segment byte array value'
        )
        return res;
    }

    protected _parseSection_data(): Data[] {
        return this._autoEmit(
            'section.datas',
            () => {
                const nData = this._autoEmit(
                    'section.datas.size',
                    () => this._decoder.uint32(),
                    'sections.datas.length',
                    'The number of data segments defined in the current module'
                );
                const datas: Data[] = [];
                for (let i = 0; i < nData; ++i) {
                    datas.push(this._autoEmit(
                        'section.datas.data',
                        () => this._parseData(i),
                        'sections.datas[' + i + ']',
                        'A data segment definition',
                        null, true
                    ))
                }
                return datas;
            },
            'sections.datas',
            'The section which contains all the data used to initialize the memories',
            null, true
        )
    }

    protected _parseSection_dataCount(): number {
        return this._autoEmit(
            'section.datacount',
            () => this._decoder.uint32(),
            'sections.datas.length',
            'The number of declared segments in the data section of the module'
        )
    } 

    protected _parseSection_start(): number {
        return this._autoEmit(
            'section.start',
            () => this._decoder.uint32(),
            'sections.start',
            v => 'References the function to execute when the module is instantiated (#sections.functions[' + v + '])'
        );
    }

    private _parseElement(index: number): Element {
        const sid = 'sections.elements[' + index + ']';
        return this._autoEmit(
            'section.elements.element',
            () => {
                let m: number = -1;
                const res: Element = {
                    offset: null,
                    table: null,
                    type: Type.funcref
                } as any;
                res.mode = this._autoEmit(
                    'section.elements.element.mode',
                    () => {
                        m = this._decoder.uint8();
                        if (m & 0b001) {
                            if (m & 0b010) { return 'declarative'; }
                            return 'passive';
                        }
                        return 'active';
                    },
                    sid + '.mode',
                    'The mode of the element segment: active elements perform a copy operation ' +
                    'at the module instantiation; passive elements can be copied by using table.init ' +
                    'instruction. A declarative element is used to forward declare references (ref.func) ' +
                    'but it will not be available at runtime'
                );

                if (m === 2 || m === 6) {
                    res.table = this._autoEmit(
                        'section.elements.element.table',
                        () => this._decoder.uint32(),
                        sid + '.table',
                        v => 'The index of the target table in the table section (#sections.tables[' + v + '])'
                    );
                }

                if (m === 0 || m === 2) {
                    res.offset = this._autoEmit(
                        'section.elements.element.offset',
                        () => this._parseExpression(
                            'section.elements.element.offset',
                            sid + '.offset',
                            'Instructions that express the offset computation'
                        ),
                        sid + '.offset',
                        'The expression that computes the offset where to start the data table insertion',
                        null, true
                    )
                }
                else if (m === 4 || m === 6) {
                    res.offset = this._autoEmit(
                        'section.elements.element.offset',
                        () => this._parseExpression(
                            'section.elements.element.offset',
                            sid + '.offset',
                            'Instructions that express the offset computation'
                        ),
                        sid + '.offset',
                        'The expression that computes the offset where to start the data table insertion',
                        null, true
                    )
                }
                
                if (m !== 0 && m !== 4) {
                    res.type = this._autoEmit(
                        'section.elements.element.type',
                        () => this._decoder.uint8() || Type.funcref,
                        sid + '.type',
                        'The type contained in the table element segment',
                        Type
                    );
                }
                else { res.table = 0; }
                
                if (m >= 4) {
                    res.init = this._autoEmit(
                        'section.elements.element.inits',
                        () => {
                            const size = this._autoEmit(
                                'section.elements.element.inits.size',
                                () => this._decoder.uint32(),
                                sid + '.init.length',
                                'The number of expressions used to initialize the table data'
                            )
                            const init: Expression[] = [];
                            for (let i = 0; i < size; ++i) {
                                init.push(this._autoEmit(
                                    'section.elements.element.inits.init',
                                    () => this._parseExpression(
                                        'section.elements.element.inits.init',
                                        sid + '.init[' + i + ']<exp>',
                                        'Instructions to initialize the current data chunk of the table'    
                                    ),
                                    sid + '.init[' + i + ']<exp>',
                                    'The expression used to initialize the subsequent data in the table'
                                ) as Expression)
                            }
                            return init;
                        },
                        sid + '.init',
                        'The expressions used to subsequently initialize data in a table',
                        null, true
                    );
                }
                else {
                    res.init = this._autoEmit(
                        'section.elements.element.inits',
                        () => {
                            const size = this._autoEmit(
                                'section.elements.element.inits.size',
                                () => this._decoder.uint32(),
                                sid + '.init.length',
                                'The number of functions called to initialize the table data'
                            )
                            const init: Expression[] = [];
                            for (let i = 0; i < size; ++i) {
                                const exp = new ExpressionReader(this._decoder, true);
                                exp.on('expression', e => init.push(e.value));
                                exp.on('error', e => this._emit('error', e));
                                init.push(this._autoEmit(
                                    'section.elements.element.inits.init',
                                    () => this._decoder.uint32(),
                                    sid + '.init[' + i + ']<func>',
                                    v => 'The function index called to initialize the subsequent data in the table (#sections.functions[' + v + '])'
                                ) as Expression);
                            }
                            return init;
                        },
                        sid + '.init',
                        'The expressions used to subsequently initialize data in a table',
                        null, true
                    );
                }

                return res;
            },
            sid,
            'An element segment which representing data to store in a table',
            null, true
        )
    }

    protected _parseSection_element(): Element[] {
        return this._autoEmit(
            'section.elements',
            () => {
                const nElem = this._autoEmit(
                    'section.elements.size',
                    () => this._decoder.uint32(),
                    'sections.elements.length',
                    'The number of element segments declared in the module'
                );
                const elems: any[] = [];
                for (let i = 0; i < nElem; ++i) {
                    elems.push(this._parseElement(i));
                }
                return elems;
            },
            'sections.elements',
            'The element section contains the data used to initialize a specific table',
            null, true
        )
    }

    private _parseGlobal(index: number): GlobalVarDecl {
        const sid = 'sections.globals[' + index + ']';
        return this._autoEmit(
            'section.globals.global',
            () => {
                const type = this._autoEmit(
                    'section.globals.global.type',
                    () => this._decoder.uint8(),
                    sid + '.type',
                    'The type of the global variable', Type
                )
                const mutable = this._autoEmit(
                    'section.globals.global.mutable',
                    () => !!this._decoder.uint8(),
                    sid + '.mutable',
                    'Whether the global variable is mutable or not'
                );
                const init = this._autoEmit(
                    'section.globals.global.init',
                    () => this._parseExpression(
                        'section.globals.global.init',
                        sid + '.init',
                        'The set of instructions that initialize the global variable'
                    ),
                    sid + '.init',
                    'Global variable initialization expression',
                    null, true
                );
                return { type, mutable, init };
            },
            sid,
            'The global variable definition',
            null, true
        );
    }

    protected _parseSection_global(): GlobalVar[] {
        return this._autoEmit(
            'section.globals',
            () => {
                const nGlobs = this._autoEmit(
                    'section.globals.size',
                    () => this._decoder.uint32(),
                    'sections.globals.length',
                    'The number of global variables declared in the module'
                );
                const globs: GlobalVarDecl[] = [];
                for (let i = 0; i < nGlobs; ++i) {
                    globs.push(this._parseGlobal(i));
                }
                return globs;
            },
            'sections.globals',
            'The section which holds all the global variable declarations of the module',
            null, true
        )
    }

    protected _parseSection_table(): Table[] {
        return this._autoEmit(
            'section.tables',
            () => {
                const nTabs = this._autoEmit(
                    'section.tables.size',
                    () => this._decoder.uint32(),
                    'sections.tables.length',
                    'The number of tables declared in the module'
                );
                const tabs: Table[] = [];
                for (let i = 0; i < nTabs; ++i) {
                    tabs.push(this._autoEmit(
                        'section.tables.table',
                        () => {
                            const type = this._autoEmit(
                                'section.tables.table.type',
                                () => this._decoder.uint8(),
                                'sections.imports[' + i + '].declaration<table>.type',
                                'The element type of the table',
                                Type
                            );
                            const hasMax = this._autoEmit(
                                'section.tables.table.hasMax',
                                () => !!this._decoder.uint8(),
                                'sections.imports[' + i + '].declaration<table>.hasMax',
                                'Wheter the maximum capacity of the table is set or not'
                            );
                            const min = this._autoEmit(
                                'section.tables.table.min',
                                () => this._decoder.uint32(),
                                'sections.imports[' + i + '].declaration<table>.min',
                                'The minimum memory size required by the table (expressed in pages)'
                            )
                            
                            const max = hasMax ? this._autoEmit(
                                'section.tables.table.max',
                                () => this._decoder.uint32(),
                                'sections.imports[' + i + '].declaration<table>.max',
                                'The maximum memory size availiable for the table (expressed in pages)'
                            ) : null;
                            
                            return { type, min, max };
                        },
                        'sections.tables[' + i + ']',
                        'The table definition', null, true
                    ));
                }
                return tabs;
            },
            'sections.tables',
            'The section which holds all the table declarations of the module',
            null, true
        )
    }

    private _parseNameMap(parent: string, parentId: string, name: string) {
        return this._u_autoEmit(
            parent + '.' + name,
            () => {
                const nFun = this._u_autoEmit(
                    parent + '.' + name + '.count',
                    () => this._decoder.uint32(),
                    parentId + '.' + name + '.length'
                );
                const fNames: Record<number, string> = {};
                for (let i = 0; i < nFun; ++i) {
                    const fn = this._u_autoEmit(
                        parent + '.' + name + '.function',
                        () => {
                            const id = this._u_autoEmit(
                                parent + '.' + name + '.function.reference',
                                () => this._decoder.uint32(),
                                v => parentId + '.' + name + '[' + v + '].reference'
                            );
                            const lName = this._u_autoEmit(
                                parent + '.' + name + '.function.name.size',
                                () => this._decoder.uint32(),
                                parentId + '.' + name + '[' + id + '].name.length'
                            )
                            const _name = this._u_autoEmit(
                                parent + '.' + name + '.function.name',
                                () => this._decoder.string(lName),
                                parentId + '.' + name + '[' + id + '].name'
                            );
                            return { id, name: _name }
                        },
                        v => parentId + '.' + name + '[' + v.id + ']',
                        null, null, true
                    )
                    fNames[fn.id] = fn.name;
                }
                return fNames;
            },
            parentId + '.' + name,
            null, null, true
        )
    }

    protected _parseSectionCustom_name(size: number): SectionCustom {
        let o = this._decoder.offset;
        const subTypes: string[] = [
            'module', 'function', 'local', 'label',
            'type', 'table', 'memory', 'global',
            'element', 'data'
        ]
        let i = 0;
        const res: any = subTypes.reduce((o, k) => (o[k] = null, o), {} as any);

        while (size > 0) {
            const sid = 'sections.customs.names[' + i + ']';
            this._u_autoEmit(
                'section.custom.names',
                () => {
                    const sub = this._u_autoEmit(
                        'section.custom.names.kind',
                        () => subTypes[this._decoder.uint8()] || 'unknown',
                        sid + '.kind'
                    );
                    if (sub === 'module') {
                        return res.module = this._u_autoEmit(
                            'section.custom.names.module',
                            () => {
                                this._u_autoEmit(
                                    'section.custom.names.module.size',
                                    () => this._decoder.uint32(),
                                    'sections.customs.names.module.size'
                                )
                                const nLen = this._u_autoEmit(
                                    'section.custom.names.module.name.size',
                                    () => this._decoder.uint32(),
                                    'sections.customs.names.module.name.length'
                                )
                                const name = this._u_autoEmit(
                                    'section.custom.names.module.name',
                                    () => this._decoder.string(nLen),
                                    'sections.customs.names.module.name'
                                )
                                return name;
                            },
                            'sections.customs.names.module', null, null, true
                        );
                    }
                    else if (sub === 'local') {
                        return res.local = this._u_autoEmit(
                            'section.custom.names.locals',
                            () => {
                                this._u_autoEmit(
                                    'section.custom.name.locals.size',
                                    () => this._decoder.uint32(),
                                    'sections.customs.names.locals.byteLength'
                                );
                                const nMaps = this._u_autoEmit(
                                    'section.custom.name.locals.count',
                                    () => this._decoder.uint32(),
                                    'sections.customs.names.locals.length'
                                );
                                const funMap: Record<number, Record<number, string>> = {};
                                for (let i = 0; i < nMaps; ++i) {
                                    const fn = this._u_autoEmit(
                                        'section.custom.name.locals.local',
                                        () => {
                                            const fId = this._u_autoEmit(
                                                'section.custom.name.locals.local.reference',
                                                () => this._decoder.uint32(),
                                                v => 'sections.customes.names.locals[' + v + ']'
                                            );
                                            const locMap = this._parseNameMap(
                                                'section.custom.name.locals.local',
                                                'sections.customs.names.locals.local',
                                                'name'
                                            );
                                            return { id: fId, map: locMap }
                                        },
                                        l => 'sections.customs.names.locals[' + l.id + ']',
                                        null, null, true
                                    )
                                    funMap[fn.id] = fn.map;
                                }
                                return funMap;
                            },
                            'sections.customs.names.locals',
                            null, null, true
                        );
                    }
                    else if (sub in res) {
                        const p = sectionTypeToPlural(sub);
                        this._u_autoEmit(
                            'section.custom.names.' + p + '.size',
                            () => this._decoder.uint32(),
                            'sections.customs.names.' + p + '.byteLength'
                        );
                        return res[sub] = this._parseNameMap(
                            'section.custom.names.' + p,
                            'sections.customs.names.' + p,
                            sub
                        );
                    }
                    return res.unknown = this._u_autoEmit(
                        'section.custom.names.unknown',
                        () => this._decoder.read(size),
                        'sections.customs.names.unknwon'
                    );
                },
                'sections.customs.names',
                null, null, true
            )
            size -= this._decoder.offset - o;
            o = this._decoder.offset;
            i++;
        }
        return { name: 'name', data: res };
    }

    protected _parseSection_custom(size: number): SectionCustom {
        return this._autoEmit('section.custom', () => {
            const start = this._decoder.offset;
            const namLen = this._decoder.uint32();
            const name = this._decoder.string(namLen);
            this._decoder.offset = start;
            this._autoEmit(
                'section.custom.name.size',
                () => this._decoder.uint32(),
                'sections.customs.' + name + '.name.length'
            );
             this._autoEmit(
                'section.custom.name',
                () => this._decoder.string(namLen),
                'sections.customs.' + name + '.name'
            );
            const method = '_parseSectionCustom_' + (name || '').toLowerCase();
            const result: SectionCustom = { name, data: null };
            const diffSize = size + start - this._decoder.offset;
            if (method in this && typeof((this as any)[method]) === 'function') {
                result.data = (this as any)[method].call(this, diffSize);
            }
            else {
                result.data = this._autoEmit(
                    'section.custom.unknown',
                    () => this._decoder.read(diffSize),
                    'sections.customs.' + name + '.unknown',
                    'An unrecognized custom section'
                );
            }
            return result;
        }, s => 'section.custom.' + s.name, null, null, true);
    }

    private _parseSectionUnknown(size: number): Uint8Array {
        return this._autoEmit(
            'section.unknown',
            () => this._decoder.read(size),
            'sections.unknown',
            'A not identified section'
        );
    }

    private _parseSection(): Section {
        const section = this._autoEmit('section', () => {
            const code = this._autoEmit(
                'section.code',
                () => this._decoder.uint8(),
                k => 'sections.' + sectionTypeToPlural(k),
                'The section kind',
                SectionTypes
            );
            const sid = 'sections.' + sectionTypeToPlural(code);
            const size = this._autoEmit('section.size', () => this._decoder.uint32(), sid + '.size', 'The current section size in bytes (size excluded)');
            const start = this._decoder.offset;
            const data = ((this as any)['_parseSection_' + SectionTypes[code]] || this._parseSectionUnknown).call(this, size);
            const sec: Section = {
                size,
                type: code,
                name: SectionTypes[code]! as keyof typeof SectionTypes,
                data: data,
            };
            const diff = size - this._decoder.offset + start;
            if (diff > 0) {
                sec.unknown = this._autoEmit(
                    'unknown',
                    () => this._decoder.read(diff),
                    sid + '.unknown',
                    'Not identified chunk of data, unexpected or unknown custom section/data'
                );
            }
            return sec;
        }, s => 'sections.' + sectionTypeToPlural(s.type), 'A section of the module', null, true);
        return section;
    }

    public read(): this {
        this._decoder.offset = this._startOffset;
        try {
            this._parseMagic();
            this._parseVersion();
            while (this._decoder.remaining) {
                this._parseSection();
            }
        }
        catch (ex) { this._emit('error', {
            error: ex instanceof Error ? ex : new Error(ex + ''),
            index: this._decoder.offset
        }); }
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