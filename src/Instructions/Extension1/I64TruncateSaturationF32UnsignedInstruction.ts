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