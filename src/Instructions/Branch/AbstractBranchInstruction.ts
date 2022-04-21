/*
 * Copyright (C) 2022 Daniele Domenichelli
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

import { ExpressionEncodeContext, Instruction, InstructionCtor } from '../Instruction';
import type { OpCodes } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { AbstractBlockInstruction } from '../Block';

export type BranchInstructionCodes = OpCodes.br | OpCodes.br_if | OpCodes.br_table;
export abstract class AbstractBranchInstruction<O extends BranchInstructionCodes=BranchInstructionCodes> extends Instruction<O> {
    public Target: AbstractBlockInstruction;
    protected constructor(code: O, target: AbstractBlockInstruction) {
        super(code);
        this.Target = target;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.Target.getLabel(this);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: InstructionCtor<AbstractBranchInstruction, [ AbstractBlockInstruction ]>,
        decoder: IDecoder,
        context: ExpressionEncodeContext
    ): AbstractBranchInstruction {
        super.decode(decoder, context);
        let label = decoder.uint32();
        if (!context.blocks[label]) { throw new Error('Encountered an invalid label'); }
        return new this(context.blocks[label]!);
    }
}