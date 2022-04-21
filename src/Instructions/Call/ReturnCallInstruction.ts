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

import { OpCodes } from '../../OpCodes';
import { AbstractCallInstruction } from './AbstractCallInstruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type * as Types from '../../Types';

export class ReturnCallInstruction extends AbstractCallInstruction<OpCodes.return_call> {
    public override get stack(): StackEdit { return [ this.Function.Parameters.slice(), this.Function.Results.slice() ]; }
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) {
        super(OpCodes.return_call);
        this.Function = fn;
    }
    public getFunctionIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Call Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.tailCall) { throw new Error('Tail call detected'); }
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): ReturnCallInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Call Instruction invalid function reference'); }
        return new ReturnCallInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
ReturnCallInstruction.registerInstruction(OpCodes.call);