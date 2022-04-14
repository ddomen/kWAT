import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I32TruncateSaturationF32SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f32_s> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f32_s); }
    public static readonly instance = new I32TruncateSaturationF32SignedInstruction();
}
I32TruncateSaturationF32SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f32_s);