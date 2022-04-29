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
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractNumericInstruction } from '../Numeric/AbstractNumericInstruction';
import type { IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext } from '../Instruction';

export type NumericTruncateInstructionCodes =
    OpCodesExt1.i32_trunc_sat_f32_s | OpCodesExt1.i32_trunc_sat_f32_u |
    OpCodesExt1.i32_trunc_sat_f64_s | OpCodesExt1.i32_trunc_sat_f64_u |
    OpCodesExt1.i64_trunc_sat_f32_s | OpCodesExt1.i64_trunc_sat_f32_u |
    OpCodesExt1.i64_trunc_sat_f64_s | OpCodesExt1.i64_trunc_sat_f64_u; 
export abstract class NumericTruncateInstruction<O extends NumericTruncateInstructionCodes> extends AbstractNumericInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: O;
    protected constructor(code: O) { super(OpCodes.op_extension_1); protect(this, 'OperationCode', code, true); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
    }
}