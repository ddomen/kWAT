import { Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { NumericTruncateInstruction } from './NumericTruncateInstruction';
import type { StackEdit } from '../Instruction';

export class I64TruncateSaturationF64SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f64_s> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f64_s); }
    public static readonly instance = new I64TruncateSaturationF64SignedInstruction();
}
I64TruncateSaturationF64SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f64_s);