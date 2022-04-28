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

import { AbstractVariableInstruction } from './AbstractVariableInstruction';
import type { OpCodes } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, InstructionCtor } from '../Instruction';

export type LocalVariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee;
export abstract class LocalVariableInstruction<O extends LocalVariableInstructionCodes=LocalVariableInstructionCodes> extends AbstractVariableInstruction<O> {
    public Variable: number;
    protected constructor(code: O, index: number) { super(code); this.Variable = index; }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.Variable);
    }
    public static override decode(
        this: InstructionCtor<LocalVariableInstruction, [ number ]>,
        decoder: IDecoder
    ): LocalVariableInstruction { return new this(decoder.uint32()); }
}