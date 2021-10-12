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

import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding'
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I32ConstInstruction extends NumericConstInstruction<OpCodes.i32_const> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ] }
    public constructor(value: number = 0) {super(OpCodes.i32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.int32(this.value | 0)
    }
    public static override decode(decoder: IDecoder): I32ConstInstruction {
        return new I32ConstInstruction(decoder.uint32());
    }
}
I32ConstInstruction.registerInstruction(OpCodes.i32_const);