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
import { GlobalVariable } from '../../Sections';
import type { OpCodes } from '../../OpCodes';
import type { ExpressionEncodeContext, InstructionCtor } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export type GlobalVariableInstructionCodes = OpCodes.global_get | OpCodes.global_set;
export abstract class GlobalVariableInstruction<O extends GlobalVariableInstructionCodes=GlobalVariableInstructionCodes>
    extends AbstractVariableInstruction<O> {
    public Variable: GlobalVariable;
    protected constructor(code: O, variable: GlobalVariable) { super(code); this.Variable = variable; }
    public getVariableIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.GlobalSection.Globals.indexOf(this.Variable);
        if (!pass && index < 0) { throw new Error('Global Variable Instruction invalid variable reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getVariableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }

    public static override decode(
        this: InstructionCtor<GlobalVariableInstruction, [ GlobalVariable ]>,
        decoder: IDecoder,
        context: ExpressionEncodeContext
    ): GlobalVariableInstruction {
        return new this(decoder.decode(GlobalVariable, context.module));
    }
}