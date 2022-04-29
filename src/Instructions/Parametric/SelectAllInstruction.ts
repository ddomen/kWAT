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

import { protect } from '../../internal';
import { OpCodes } from '../../OpCodes';
import { Type, ValueType } from '../../Types';
import { ParametricInstruction } from './ParametricInstruction';
import type { ExpressionDecodeContext, ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class SelectAllInstruction extends ParametricInstruction<OpCodes.select_t> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [] ]; }
    public readonly Values!: ValueType[];
    public constructor(values: ValueType[]) { super(OpCodes.select_t); protect(this, 'Values', values.slice(), true); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.vector(this.Values, 'uint32');
    }
    public static override decode(decoder: IDecoder, _?: ExpressionDecodeContext): SelectAllInstruction {
        return new SelectAllInstruction(decoder.vector('uint8'));
    }
}
SelectAllInstruction.registerInstruction(OpCodes.select_t);