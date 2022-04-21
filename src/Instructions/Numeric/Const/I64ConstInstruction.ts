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
import type { IDecoder, IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I64ConstInstruction extends NumericConstInstruction<OpCodes.i64_const> {
    public override get stack(): StackEdit { return [ [], [ Type.i64 ] ] }
    public constructor(value: number | bigint = 0) {super(OpCodes.i64_const, value as number); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.int64(this.Value)
    }
    public static override decode(decoder: IDecoder): I64ConstInstruction {
        return new I64ConstInstruction(decoder.uint64());
    }
}
I64ConstInstruction.registerInstruction(OpCodes.i64_const);