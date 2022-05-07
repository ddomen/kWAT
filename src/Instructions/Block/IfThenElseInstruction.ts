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
import { AbstractBlockInstruction, BlockType } from './AbstractBlockInstruction';
import * as Types from '../../Types';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, Instruction, StackEdit } from '../Instruction';

export class IfThenElseInstruction extends AbstractBlockInstruction<OpCodes.if> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly else!: Instruction[];
    public get then(): Instruction[] { return this.block; }
    public constructor(thenType?: BlockType, then: Instruction[] = [], elseBlock: Instruction[]=[]) {
        super(OpCodes.if, thenType, then);
        protect(this, 'else', elseBlock.slice(), true);
    }

    public override getDefinedTypes(): Types.FunctionType[] {
        let result = []
        result.push(
            ...this.block
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), []),
            ...this.else
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), [])
        );
        if (this.type instanceof Types.FunctionType) { result.unshift(this.type); }
        return result;
    }

    public override encodeBlock(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encodeBlock(encoder, context)
        if (this.else.length) { encoder.uint8(OpCodes.else).array(this.else, context); }
    }

    public override decode(decoder: IDecoder, context: ExpressionEncodeContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        let elseBlock: Instruction[] = [];
        if (decoder.uint8() === OpCodes.else) {
            elseBlock = this.decodeBlock(decoder, context);
            decoder.uint8();
        }
        if (context.blocks.shift() !== this) { throw new KWatError('Unexpected block on the context stack'); }
        this.type = type;
        this.block.length = 0;
        this.block.push(...block);
        this.else.length = 0;
        this.else.push(...elseBlock);
    }
}
IfThenElseInstruction.registerInstruction(OpCodes.if);