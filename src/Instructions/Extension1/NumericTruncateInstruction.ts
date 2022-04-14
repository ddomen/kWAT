import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractNumericInstruction } from '../Numeric/AbstractNumericInstruction';
import type { IEncoder } from '../../Encoding';
import type { ExpressionContext } from '../Instruction';

export type NumericTruncateInstructionCodes =
    OpCodesExt1.i32_trunc_sat_f32_s | OpCodesExt1.i32_trunc_sat_f32_u |
    OpCodesExt1.i32_trunc_sat_f64_s | OpCodesExt1.i32_trunc_sat_f64_u |
    OpCodesExt1.i64_trunc_sat_f32_s | OpCodesExt1.i64_trunc_sat_f32_u |
    OpCodesExt1.i64_trunc_sat_f64_s | OpCodesExt1.i64_trunc_sat_f64_u; 
export abstract class NumericTruncateInstruction<O extends NumericTruncateInstructionCodes> extends AbstractNumericInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: O;
    protected constructor(code: O) { super(OpCodes.op_extension_1); protect(this, 'OperationCode', code, true); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
    }
}