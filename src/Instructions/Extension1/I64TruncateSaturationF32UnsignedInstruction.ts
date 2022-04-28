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

import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I64TruncateSaturationF32UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f32_u> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f32_u); }
    public static readonly instance = new I64TruncateSaturationF32UnsignedInstruction();
}
I64TruncateSaturationF32UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f32_u);