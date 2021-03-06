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
import { Instruction as IX } from '../Instructions';
import { OpCodes, OpCodesExt1, OpCodesExt2 } from '../OpCodes';
import type { IDecoder } from '../Encoding';
import type { GenericReaderEvent, ReaderEventCallback } from './Reader';

export type ExpressionReaderEvent<K extends keyof ExpressionReaderEventMap = keyof ExpressionReaderEventMap, V = any> = {
    value: V,
    type: K
} & GenericReaderEvent;
export type ExpressionReaderEventMap = {
    error: { error: Error, index: number },
    all: ExpressionReaderEvent,

    expression: ExpressionReaderEvent<'expression', Expression>,
    'expression.instruction': ExpressionReaderEvent<'expression.instruction', Instruction>,
    'expression.instruction.code': ExpressionReaderEvent<'expression.instruction.code', OpCodes>,
    'expression.instruction.code.extension': ExpressionReaderEvent<'expression.instruction.code.extension', OpCodesExt1 | OpCodesExt2>,
    'expression.instruction.value': ExpressionReaderEvent<'expression.instruction.value', any>
}
type ReaderEventEsK = { [K in keyof ExpressionReaderEventMap]: ExpressionReaderEventMap[K] extends ExpressionReaderEvent ? K : never  }[keyof ExpressionReaderEventMap];
type ReaderEventValue<K extends ReaderEventEsK> = ExpressionReaderEventMap[K] extends ExpressionReaderEvent<K, infer E> ? E : never;

export type Instruction<C extends OpCodes = OpCodes> = {
    code: C,
    extension: C extends OpCodes.op_extension_1 ? OpCodesExt1 :
             C extends OpCodes.op_extension_2 ? OpCodesExt2 :
             null,
    value: any
}
export type Expression = Instruction[];

const opDescriptions: Record<OpCodes, string> & {
    [OpCodes.op_extension_1]: Record<OpCodesExt1, string>,
    [OpCodes.op_extension_2]: Record<OpCodesExt1, string>
} = {
    [OpCodes.op_extension_1]: {},
    [OpCodes.op_extension_2]: {},
} as any;
const opDescriptions_ext1: Record<OpCodesExt1, string> = {} as any;
const opDescriptions_ext2: Record<OpCodesExt2, string> = {} as any;

export class ExpressionReader {
    private readonly _startOffset!: number;
    private readonly _handlers!: { [K in keyof ExpressionReaderEventMap]: ReaderEventCallback<ExpressionReaderEventMap[K]>[] };
    private readonly _decoder!: IDecoder;
    public strict: boolean;

    public constructor(decoder: IDecoder, strict?: boolean) {
        protect(this as any as { _startOffset: number }, '_startOffset', decoder.offset);
        protect(this as any as { _handlers: any }, '_handlers', {});
        protect(this as any as { _decoder: IDecoder }, '_decoder', decoder);
        this.strict = !!strict;
    }

    private _emit<K extends keyof ExpressionReaderEventMap>(type: K, event: ExpressionReaderEventMap[K]): this {
        if (type in this._handlers) { this._handlers[type].forEach(cb => (cb as any).call(this, event)); }
        if (type !== 'all' && type !== 'error') { this._emit('all', event as ExpressionReaderEvent<any>); }
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
        composite: boolean | null = false
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
        if (composite === null) { composite = typeof(value) === 'object' && value !== null; }
        this._emit(type, { data, index, value, type, composite, textualValue, description, id } as any);
        return value;
    }

    private _parseCode(index: number): number {
        return this._autoEmit(
            'expression.instruction.code',
            () => this._decoder.uint8(),
            'expression.instructions[' + index + ']',
            'Code of the instruction', OpCodes
        ) as OpCodes;
    }
    private _parseExtCode(code: OpCodes, index: number): number | null {
        return code === OpCodes.op_extension_1 || code === OpCodes.op_extension_2 ?
                    this._autoEmit(
                        'expression.instruction.code.extension',
                        () => this._decoder.uint8(),
                        'expression.instructions[' + index + '].ext',
                        'Extension code of the instruction', OpCodes
                    ) as OpCodesExt1 :
                    null;
    }
    private _parseValue(code: OpCodes, ext: OpCodesExt1 | OpCodesExt2 | null, index: number): any {
        let methodName = '_parse_' + code;
        let desc = opDescriptions[code];
        if (ext !== null) {
            methodName += '_' + ext;    
            desc = desc[ext]!;
        }
        desc ||= 'Unknown value description';
        if (methodName in this) {
            return this._autoEmit(
                'expression.instruction.value',
                () => (this as any)[methodName](index),
                'expression.instructions[' + index + '].value',
                desc, null, null
            );
        }
        return null;
    }

    protected ['_parse_' + OpCodes.call]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.call_indirect](index: number) {
        return {
            type: this._u_autoEmit(
                'expression.instruction.value.call_indirect.type',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<call.indirect>.type'
            ),
            index: this._u_autoEmit(
                'expression.instruction.value.call_indirect.reference',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<call.indirect>.reference'
            )
        };
    }

    protected ['_parse_' + OpCodes.i32_const]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.i64_const]() { return this._decoder.uint64(); }
    protected ['_parse_' + OpCodes.f32_const]() { return this._decoder.float32(); }
    protected ['_parse_' + OpCodes.f64_const]() { return this._decoder.float64(); }

    private _parse_memory(index: number, name: (keyof typeof OpCodes)) {
        const rName = name.replace(/_/g, '.');
        return {
            memory:  this._u_autoEmit(
                'expression.instruction.value.' + name + '.memory',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<' + rName + '>.memory'
            ),
            index:  this._u_autoEmit(
                'expression.instruction.value.' + name + '.index',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<' + rName + '>.index'
            )
        };
    }
    
    protected ['_parse_' + OpCodes.i32_store](index: number) { return this._parse_memory(index, 'i32_store'); }
    protected ['_parse_' + OpCodes.i32_store8](index: number) { return this._parse_memory(index, 'i32_store8'); }
    protected ['_parse_' + OpCodes.i32_store16](index: number) { return this._parse_memory(index, 'i32_store16'); }
    protected ['_parse_' + OpCodes.i64_store](index: number) { return this._parse_memory(index, 'i64_store'); }
    protected ['_parse_' + OpCodes.i64_store8](index: number) { return this._parse_memory(index, 'i64_store8'); }
    protected ['_parse_' + OpCodes.i64_store16](index: number) { return this._parse_memory(index, 'i64_store16'); }
    protected ['_parse_' + OpCodes.i64_store32](index: number) { return this._parse_memory(index, 'i64_store32'); }
    protected ['_parse_' + OpCodes.f32_store](index: number) { return this._parse_memory(index, 'f32_store'); }
    protected ['_parse_' + OpCodes.f64_store](index: number) { return this._parse_memory(index, 'f64_store'); }

    protected ['_parse_' + OpCodes.i32_load](index: number) { return this._parse_memory(index, 'i32_load'); }
    protected ['_parse_' + OpCodes.i32_load8_s](index: number) { return this._parse_memory(index, 'i32_load8_s'); }
    protected ['_parse_' + OpCodes.i32_load8_u](index: number) { return this._parse_memory(index, 'i32_load8_u'); }
    protected ['_parse_' + OpCodes.i32_load16_u](index: number) { return this._parse_memory(index, 'i32_load16_u'); }
    protected ['_parse_' + OpCodes.i32_load16_s](index: number) { return this._parse_memory(index, 'i32_load16_s'); }
    protected ['_parse_' + OpCodes.i64_load](index: number) { return this._parse_memory(index, 'i64_load'); }
    protected ['_parse_' + OpCodes.i64_load8_s](index: number) { return this._parse_memory(index, 'i64_load8_s'); }
    protected ['_parse_' + OpCodes.i64_load8_u](index: number) { return this._parse_memory(index, 'i64_load8_u'); }
    protected ['_parse_' + OpCodes.i64_load16_s](index: number) { return this._parse_memory(index, 'i64_load16_s'); }
    protected ['_parse_' + OpCodes.i64_load16_u](index: number) { return this._parse_memory(index, 'i64_load16_u'); }
    protected ['_parse_' + OpCodes.i64_load32_s](index: number) { return this._parse_memory(index, 'i64_load32_s'); }
    protected ['_parse_' + OpCodes.i64_load32_u](index: number) { return this._parse_memory(index, 'i64_load32_u'); }
    protected ['_parse_' + OpCodes.f32_load](index: number) { return this._parse_memory(index, 'f32_load'); }
    protected ['_parse_' + OpCodes.f64_load](index: number) { return this._parse_memory(index, 'f64_load'); }

    protected ['_parse_' + OpCodes.local_get]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.local_set]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.local_tee]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.global_get]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.global_set]() { return this._decoder.uint32(); }

    private _parse_block(index: number, name: (keyof typeof OpCodes)) {
        const rName = name.replace(/_/g, '.');
        return {
            type: this._u_autoEmit(
                'expression.instruction.value.' + name + '.type',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<' + rName + '>.type',
                null, Type
            ),
            expression: this._u_autoEmit(
                'expression.instruction.value.' + name + '.expression',
                () => this._parseExpression(),
                'expression.instructions[' + index + '].value<' + rName + '>.expression',
                null, null, true
            )
        };
    }

    protected ['_parse_' + OpCodes.block](index: number) { return this._parse_block(index, 'block'); }
    protected ['_parse_' + OpCodes.loop](index: number) { return this._parse_block(index, 'loop'); }
    protected ['_parse_' + OpCodes.if](index: number) { return this._parse_block(index, 'if'); }

    protected ['_parse_' + OpCodes.br]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.br_if]() { return this._decoder.uint32(); }
    protected ['_parse_' + OpCodes.br_table](index: number) { 
        const size = this._u_autoEmit(
            'expression.instruction.value.br_table.memory',
            () => this._decoder.uint32() + 1,
            'expression.instructions[' + index + '].value<br.table>.size'
        );
        const res: number[] = [];
        for (let i = 0; i < size; ++i) {
            res.push(this._u_autoEmit(
                'expression.instruction.value.br_table.label',
                () => this._decoder.uint32(),
                'expression.instructions[' + index + '].value<br.table>.labels[' + i + ']'
            ));
        }
        return res;
    }

    private _parseInstruction(index: number): Instruction {
        return this._autoEmit(
            'expression.instruction',
            () => {
                const code = this._parseCode(index);
                const extension = this._parseExtCode(code, index);
                const value = this._parseValue(code, extension, index);
                return { code, extension, value };
            },
            'expression.instructions[' + index + ']',
            v => (
                v.extension !== null ?
                    v.code === OpCodes.op_extension_1 ?
                        opDescriptions_ext1[v.extension as OpCodesExt1] :
                        opDescriptions_ext2[v.extension as OpCodesExt2] :
                    opDescriptions[v.code]
            ) || 'Unknown Instruction',
            v => {
                const c = IX.resolveInstruction(v.extension === null ? v.code : v.extension);
                return c ?
                        'instance' in c ?
                            c.instance.constructor.name :
                            (c as any).name :
                        '???';
            }, true
        );
    }

    private _parseExpression() {
        let arr: Expression = [];
        let j = 0;
        while (this._decoder.peek() !== OpCodes.end) { arr.push(this._parseInstruction(j++)); }
        arr.push(this._parseInstruction(++j));
        return arr;
    }

    public read(): this {
        this._decoder.offset = this._startOffset;
        try {
            this._autoEmit(
                'expression',
                () => this._parseExpression(),
                'expression', 'An expression',
                null, true
            ) as Expression;
        }
        catch (ex) {
            this._emit('error', {
                error: ex instanceof Error ? ex : new Error(ex + ''),
                index: this._decoder.offset
            });
        }
        return this;
    }

    public on<K extends keyof ExpressionReaderEventMap>(type: K, handler: ReaderEventCallback<ExpressionReaderEventMap[K]>): this {
        if (typeof(handler) === 'function') {
            if (!(type in this._handlers)) { this._handlers[type] = []; }
            this._handlers[type].push(handler as any);
        }
        return this;
    }

    public off<K extends keyof ExpressionReaderEventMap>(type: K, handler?: ReaderEventCallback<ExpressionReaderEventMap[K]>): this {
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