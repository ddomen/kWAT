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

import { Module, WasmOptions } from '../Module';
import { OpCodes } from '../OpCodes';
import { protect } from '../internal';
import { Instruction } from './Instruction';
import { AbstractBlockInstruction } from './Block';
import { GlobalVariableInstruction } from './Variable';
import * as Types from '../Types';
import * as Sections from '../Sections';
import type { IDecoder, IEncodable, IEncoder } from '../Encoding';

/** A Passable<Bool, R> type returns R only if B evaluate to true,
 * otherwise an error occurred during the evaluation, so it return never
 */
export type Passable<T extends boolean | undefined, R> = R | (T extends false | undefined ? never : null);

/** A class representing a list of instructions which can be encoded */
export class Expression implements IEncodable<[Module, WasmOptions]> {

    /** The set of the instructions holded by this expression */
    public readonly Instructions!: Instruction[];
    
    /** Create and fill an expression of instructions
     * @param {Instruction[]} instructions the instruction holded by the new expression
     */
    public constructor(instructions: Instruction[]=[]) {
        protect(this, 'Instructions', instructions.slice(), true);
    }

    /** Retrieve all the defined (function) types in the current set of instructions
     * @return {Types.FunctionType[]} all the defined (function) types
     */
    public getDefinedTypes(): Types.FunctionType[] {
        return this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedTypes())
                    .reduce((a, v) => (a.push(...v), a), []);
    }

    /** Retrieve all the defined global variables in the current set of instructions
     * @return {Types.GlobalVariable[]} all the defined global variables
     */
    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.Instructions
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).Variable);
        r.push(
            ...this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public encode(encoder: IEncoder, context: Module, opts: WasmOptions): void {
        encoder
            .array(this.Instructions, { module: context, blocks: [], options: opts })
            .uint8(OpCodes.end);
    }

    /** Evaluates the stack through all the set of instructions,
     * starting from a params stack.
     * @param {Types.ResultType} params the current stack
     * @return {Types.ResultType} the evaluated stack
     */
    public evaluate(params: Types.ResultType): Types.ResultType;
    /** Evaluates the stack through all the set of instructions,
     * starting from a params stack.
     * @param {Types.ResultType} params the current stack
     * @param {B} pass don't throw errors if the operation fails
     * @return {Passable<B, Types.ResultType>} the evaluated stack
     */
    public evaluate<B extends boolean>(params: Types.ResultType, pass: B): Passable<B, Types.ResultType>;
    public evaluate(params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        return Instruction.resolveStack(this.Instructions, params, pass);
    }
    
    /** Reads and decodes a list of instructions (Expression) from a decoder
     * @param {IDecoder} decoder the target decoder
     * @param {Module} mod the holder module
     * @return {Expression} the read expression
    */
    public static decode(decoder: IDecoder, mod: Module): Expression {
        let exp = new Expression();
        while (decoder.peek() != OpCodes.end) {
            exp.Instructions.push(Instruction.decode(decoder, { module: mod, blocks: [] }));
        }
        decoder.uint8();
        return exp;
    }
}