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

import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding'
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class F64ConstInstruction extends NumericConstInstruction<OpCodes.f64_const> {
    public override get stack(): StackEdit { return [ [], [ Type.f64 ] ] }
    public constructor(value: number = 0) { super(OpCodes.f64_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.float64(this.Value)
    }
    public static override decode(decoder: IDecoder): F64ConstInstruction {
        return new F64ConstInstruction(decoder.float64());
    }
}
F64ConstInstruction.registerInstruction(OpCodes.f64_const)