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

import { OpCodes } from '../../OpCodes';
import { protect } from '../../internal';
import { KWatError } from '../../errors';
import { GlobalVariableInstruction } from '../Variable';
import { FunctionType, Type, ValueType } from '../../Types';
import { ControlInstruction } from '../Control/ControlInstruction';
import { ExpressionEncodeContext, Instruction, InstructionCtor } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type * as Sections from '../../Sections';
import type { AbstractBranchInstruction } from '../Branch';

export const EmptyBlock = 0x40;

export type BlockType = null | ValueType | FunctionType;
export type BlockInstructionCodes = OpCodes.block | OpCodes.loop | OpCodes.if;


export abstract class AbstractBlockInstruction<O extends BlockInstructionCodes=BlockInstructionCodes> extends ControlInstruction<O> {
    public type: BlockType;
    public readonly block!: Instruction[];

    protected constructor(code: O, block?: BlockType, instructions: Instruction[]=[]) {
        super(code);
        this.type = block || null;
        protect(this, 'block', instructions.slice(), true);
    }

    public getDefinedTypes(): FunctionType[] {
        let result = this.block
                        .filter(i => i instanceof AbstractBlockInstruction)
                        .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
                        .reduce((a, v) => (a.push(...v), a), []);
        if (this.type instanceof FunctionType) { result.unshift(this.type); }
        return result;
    }
    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.block
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).variable);
        r.push(
            ...this.block
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public getLabel(relative: AbstractBranchInstruction, pass?: boolean) {
        let children: AbstractBlockInstruction<BlockInstructionCodes>[] = [];
        if (this.block.find(i => (i instanceof AbstractBlockInstruction && children.push(i), i === relative))) {
            return 0;
        }
        let l: number = -1;
        if (children.find(c => (l = c.getLabel(relative, true), l != -1))) { return l + 1; }
        if (!pass) { throw new KWatError('Branch Instruction is not part of this Block Instruction'); }
        return -1;
    }

    protected encodeOpen(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        if (!this.type) { encoder.uint8(EmptyBlock); }
        else if (this.type instanceof FunctionType) {
            let index = context.module.indexOf(this.type);
            if (index < 0) { throw new KWatError('Invalid Block Type type reference'); }
            encoder.int32(index);
        }
        else { encoder.uint8(this.type); }
    }
    protected encodeBlock(encoder: IEncoder, context: ExpressionEncodeContext): void {
        encoder.array(this.block, context);
    }
    protected encodeClose(encoder: IEncoder, _: ExpressionEncodeContext): void {
        encoder.uint8(OpCodes.end);
    }

    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        context.blocks.unshift(this);
        this.encodeOpen(encoder, context);
        this.encodeBlock(encoder, context);
        this.encodeClose(encoder, context);
        if (context.blocks.shift() !== this) { throw new KWatError('Unexpected block on the context stack'); }
    }

    protected decodeType(decoder: IDecoder, context: ExpressionEncodeContext): BlockType {
        let header = decoder.peek(), block;
        if (header === EmptyBlock) { block = null; decoder.uint8(); }
        else if (header in Type) { block = header; decoder.uint8(); }
        else {
            let index = decoder.int32();
            if (!context.module.typeSection.types[index]) {
                throw new KWatError('Invalid Block Type type reference');
            }
            block = context.module.typeSection.types[index]!;
        }
        return block;
    }
    protected decodeBlock(decoder: IDecoder, context: ExpressionEncodeContext): Instruction[] {
        let instructions = [];
        let c = decoder.peek();
        while (c != OpCodes.end && c != OpCodes.else) {
            instructions.push(decoder.decode(Instruction, context));
            c = decoder.peek();
        }
        return instructions;
    }
    public decode(decoder: IDecoder, context: ExpressionEncodeContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        decoder.uint8();
        if (context.blocks.shift() !== this) { throw new KWatError('Unexpected block on the context stack'); }
        this.type = type;
        this.block.length = 0;
        this.block.push(...block);
    }

    public static override decode<O extends BlockInstructionCodes>(
        this: InstructionCtor<AbstractBlockInstruction<O>>,
        decoder: IDecoder,
        context: ExpressionEncodeContext
    ): AbstractBlockInstruction<O> {
        let block = new this();
        block.decode(decoder, context);
        return block;
    }
    public static readonly EmptyBlock = EmptyBlock;
}