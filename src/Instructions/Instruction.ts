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

import { protect } from '../internal';
import { KWatError } from '../errors';
import { OpCodes, OpCodesExt1, OpCodesExt2 } from '../OpCodes';
import * as Types from '../Types'
import type { Module, WasmOptions } from '../Module';
import type { IDecodable, IDecoder, IEncodable, IEncoder } from '../Encoding';
import type { Expression, Passable } from './Expression';
import type { AbstractBlockInstruction } from './Block';

export type Instructible<O extends OpCodes=OpCodes> = { instance: Instruction<O> } | IDecodable<Instruction<O>, [ ExpressionDecodeContext ]>;
export type Ext1Instructible<O extends OpCodesExt1=OpCodesExt1> = { instance: Ext1Instruction<O> } | IDecodable<Ext1Instruction<O>, [ ExpressionDecodeContext ]>;
export type Ext2Instructible<O extends OpCodesExt2=OpCodesExt2> = { instance: Ext2Instruction<O> } | IDecodable<Ext2Instruction<O>, [ ExpressionDecodeContext ]>;
export type ExpressionDecodeContext = { module: Module, blocks: AbstractBlockInstruction[] };
export type ExpressionEncodeContext = ExpressionDecodeContext & { options: WasmOptions };
export type StackEdit = [ (Types.ValueType | null)[], (Types.ValueType | { ref: number })[] ];
export type DefiniteStackEdit = [ Types.Stack, Types.Stack ];
export type InstructionCtor<I extends Instruction, Args extends any[]=[]> = { new(...args: Args): I };

export type Ext1Instruction<O extends OpCodesExt1=OpCodesExt1> = Instruction<OpCodes.op_extension_1> & { OperationCode: O };
export type Ext2Instruction<O extends OpCodesExt2=OpCodesExt2> = Instruction<OpCodes.op_extension_2> & { OperationCode: O };

export abstract class Instruction<O extends OpCodes=OpCodes> implements IEncodable<ExpressionEncodeContext> {
    public readonly Code!: O;
    public get stack(): StackEdit { return [ [], [] ]; }
    protected constructor(code: O) { protect(this, 'Code', code, true); }
    public getIndex(expression: Expression, pass?: boolean): number {
        let index = expression.Instructions.indexOf(this);
        if (!pass && index < 0) { throw new KWatError('Instruction not present in the current expression'); }
        return index;
    }
    public encode(encoder: IEncoder, _: ExpressionEncodeContext): void { encoder.uint8(this.Code); }

    public evaluate(stack: Types.Stack): Passable<undefined, Types.ResultType>;
    public evaluate<B extends boolean>(stack: Types.Stack, pass: B): Passable<B, Types.ResultType>;
    public evaluate(stack: Types.Stack, pass?: boolean): Passable<typeof pass, Types.ResultType>;
    public evaluate(stack: Types.Stack, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        if (!Array.isArray(stack)) { throw new TypeError('First argument must be a ResultType (Array<ValueType>)'); }
        let wrong!: [number, number];
        if (stack.some((n, i) => (wrong = [n, i], !Types.validValue(n)))) {
            throw new KWatError('Invalid ValueType in params: 0x' + Number(wrong[0]).toString(16) + ' (index: ' + wrong[1] + ')');
        }
        let stackEdit = this.stack;
        let stackOp = stack.slice();
        let result: Types.ResultType | null = null;
        let typeStack: Types.ValueType[] = [];
        if (stackEdit[0].every(s => {
            const c = stackOp.pop();
            if (typeof(c) === 'undefined') { return false; }
            if (c === s) { return true; }
            if (s === null) { typeStack.push(c); return true; }
            return false;
        })) {
            stackOp.push(...stackEdit[1].map(x => typeof(x) === 'object' ? typeStack[x.ref]! : x));
            result = stackOp;
        }
        if (!pass && !result) {
            throw new KWatError(
                'Can not resolve stack for ' + this.constructor.name +
                ' current stack: [' + stack.map(s => Types.Type[s]).join(', ') + ']' +
                ' instruction edit: [' + (stackEdit[0] || []).map(s => typeof(s) === 'object' ? '?' : Types.Type[s]) + '] -> [' +
                (stackEdit[1] || []).map(s => typeof(s) === 'object' ? '?' : Types.Type[s]) + ']'
            );
        }
        return result;
    }

    private static readonly _instructionSet: { [key in OpCodes]?: Instructible } = { };
    private static readonly _ext1Set: { [key in OpCodesExt1]?: Ext1Instructible } = { };
    private static readonly _ext2Set: { [key in OpCodesExt2]?: Ext2Instructible } = { };

    public static resolveInstruction(code: OpCodes | OpCodesExt1 | OpCodesExt2): Instructible | null {
        if (code in OpCodes) { return Instruction._instructionSet[code as OpCodes]!; }
        else if (code in OpCodesExt1) { return Instruction._ext1Set[code as OpCodesExt1]!; }
        else if (code in OpCodesExt2) { return Instruction._ext2Set[code as OpCodesExt2]!; }
        return null;
    }

    public static registerInstruction<O extends Exclude<OpCodes, OpCodes.op_extension_1>>(this: Instructible<O>, key: O): void;
    public static registerInstruction<O extends OpCodesExt1>(this: Ext1Instructible<O>, key: OpCodes.op_extension_1, forward: O): void;
    public static registerInstruction<O extends OpCodesExt2>(this: Ext2Instructible<O>, key: OpCodes.op_extension_2, forward: O): void;
    public static registerInstruction(this: Instructible | Ext1Instructible, key: OpCodes, forward?: OpCodesExt1): void {
        if (key === OpCodes.op_extension_1) {
            if (!((typeof(forward) === 'undefined' ? -1 : forward) in OpCodesExt1)) { throw new KWatError('Invalid forward code 0x' + Number(forward).toString(16)); }
            Instruction._ext1Set[forward!] = this as Ext1Instructible;
        }
        else if (key === OpCodes.op_extension_2) {
            if (!((typeof(forward) === 'undefined' ? -1 : forward) in OpCodesExt2)) { throw new KWatError('Invalid forward code 0x' + Number(forward).toString(16)); }
            Instruction._ext2Set[forward!] = this as Ext2Instructible;
        }
        else if (!(key in OpCodes)) { throw new KWatError('Invalid opcode 0x' + Number(key).toString(16)); }
        else { Instruction._instructionSet[key] = this as Instructible; }
    }
    public static decode(decoder: IDecoder, context: ExpressionDecodeContext): Instruction {
        let code: OpCodes = decoder.uint8(), fwd: OpCodesExt1 | OpCodesExt2 = -1, ctor;
        if (code === OpCodes.op_extension_1) { ctor = Instruction._ext1Set[(fwd = decoder.uint32() as OpCodesExt1)]; }
        else if (code === OpCodes.op_extension_2) { ctor = Instruction._ext2Set[(fwd = decoder.uint32() as OpCodesExt2)]; }
        else { ctor = Instruction._instructionSet[code]; }
        if (!ctor) { throw new KWatError('Unsupported Instruction code: 0x' + Number(code).toString(16) + (fwd >= 0 ? ' 0x' + Number(fwd).toString(16) : '')); }
        if ('instance' in ctor && ctor.instance instanceof Instruction) { return ctor.instance; }
        else if ('decode' in ctor && typeof(ctor.decode) === 'function') { return ctor.decode(decoder, context); }
        else { throw new KWatError('Unsupported Instruction code: 0x' + Number(code).toString(16) + (fwd >= 0 ? ' 0x' + Number(fwd).toString(16) : '')); }
    }
    public static resolveStack(instructions: Instruction[], params: Types.ResultType): Passable<undefined, Types.ResultType>
    public static resolveStack<B extends boolean>(instructions: Instruction[], params: Types.ResultType, pass: B): Passable<B, Types.ResultType>
    public static resolveStack(instructions: Instruction[], params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType>
    public static resolveStack(instructions: Instruction[], params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        if (!Array.isArray(instructions) || instructions.some(i => !(i instanceof Instruction))) {
            throw new TypeError('Invalid argument: first argument must be an Array<Instruction>');
        }
        if (!instructions.length) { return params; }
        let curr: Types.ResultType | null = params;
        for (let instr of instructions) {
            curr = instr.evaluate(curr, pass);
            if (!curr) { break; }
        } 
        return curr;
    }

    public static checkStack(instructions: Instruction[], stack: DefiniteStackEdit): boolean;
    public static checkStack(instructions: Instruction[], signature: Types.FunctionType): boolean;
    public static checkStack(instructions: Instruction[], params: Types.ResultType, results: Types.ResultType): boolean;
    public static checkStack(instructions: Instruction[], stack: DefiniteStackEdit | Types.ResultType | Types.FunctionType, results?: Types.ResultType): boolean {
        if (stack instanceof Types.FunctionType) { stack = [ stack.parameters, stack.results ]; }
        else if (Array.isArray(results)) { stack = [ stack as Types.ResultType, results ]; }
        if (!Array.isArray(stack)) { throw new TypeError('Invalid argument: second argument must be of type Stack|FunctionType|ResultType'); }
        if (!Array.isArray(stack[0]) || !Array.isArray(stack[1])) {
            throw new TypeError(
                'Argument mismatch: the signature is checkStack(Array<Instruction>, Stack|FunctionType) | '+
                'checkStack(Array<Instruction>, ResultType, ResultType)'
            );
        }
        let wrong!: [ boolean, number, number ];
        if (stack.some((s, x) => (s as Types.ResultType).some((v, i) => (wrong = [ !!x, v, i ], !Types.validValue(v))))) {
            throw new KWatError(
                'Invalid ValueType in ' + (wrong[0] ? 'Results' : 'Parameters') +
                ': 0x' + Number(wrong[1]).toString(16) + ' (index: ' + wrong[2] + ')'
            );
        }
        let result = this.resolveStack(instructions, stack[0], true);
        let expected = stack[1];
        return result && result.length == expected.length &&
                result.every((v, i) => v === expected[i]) || false;
    }

    public static get AllInstructionTypes(): InstructionCtor<Instruction, any[]>[] {
        return Object.values(Instruction._instructionSet)
            .concat(Object.values(Instruction._ext1Set))
            .concat(Object.values(Instruction._ext2Set))
            .map(x => 'instance' in x ? x.instance.constructor : x as any);
    }
}