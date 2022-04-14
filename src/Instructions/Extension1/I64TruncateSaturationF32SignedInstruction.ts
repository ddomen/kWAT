import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I64TruncateSaturationF32SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f32_s> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f32_s); }
    public static readonly instance = new I64TruncateSaturationF32SignedInstruction();
}
I64TruncateSaturationF32SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f32_s);