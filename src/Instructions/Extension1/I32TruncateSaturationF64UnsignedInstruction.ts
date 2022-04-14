import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I32TruncateSaturationF64UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f64_u> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f64_u); }
    public static readonly instance = new I32TruncateSaturationF64UnsignedInstruction();
}
I32TruncateSaturationF64UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f64_u);