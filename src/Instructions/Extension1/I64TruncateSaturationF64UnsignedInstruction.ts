import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I64TruncateSaturationF64UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f64_u> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f64_u); }
    public static readonly instance = new I64TruncateSaturationF64UnsignedInstruction();
}
I64TruncateSaturationF64UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f64_u);