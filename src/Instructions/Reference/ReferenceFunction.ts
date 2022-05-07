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
import { KWatError } from '../../errors';
import { ReferenceInstruction } from './ReferenceInstruction';
import type { ExpressionEncodeContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type * as Types from '../../Types';

export class ReferenceFunctionInstruction extends ReferenceInstruction<OpCodes.ref_func> {
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) { super(OpCodes.ref_func); this.Function = fn; }
    public getFunctionIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.functionSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new KWatError('Reference Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): ReferenceFunctionInstruction {
        let index = decoder.uint32();
        if (!context.module.functionSection.functions[index]) { throw new KWatError('Reference Instruction invalid function reference'); }
        return new ReferenceFunctionInstruction(context.module.functionSection.functions[index]!);
    }
}
ReferenceFunctionInstruction.registerInstruction(OpCodes.ref_func);