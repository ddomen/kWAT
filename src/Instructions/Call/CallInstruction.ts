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
import { AbstractCallInstruction } from './AbstractCallInstruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type * as Types from '../../Types';

export class CallInstruction extends AbstractCallInstruction<OpCodes.call> {
    public override get stack(): StackEdit { return [ this.function.parameters.slice(), this.function.results.slice() ]; }
    public function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) {
        super(OpCodes.call);
        this.function = fn;
    }
    public getFunctionIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.typeSection.indexOf(this.function);
        if(!pass && index < 0) { throw new KWatError('Call Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): CallInstruction {
        let index = decoder.uint32();
        if (!context.module.functionSection.functions[index]) { throw new KWatError('Call Instruction invalid function reference'); }
        return new CallInstruction(context.module.functionSection.functions[index]!);
    }
}
CallInstruction.registerInstruction(OpCodes.call);