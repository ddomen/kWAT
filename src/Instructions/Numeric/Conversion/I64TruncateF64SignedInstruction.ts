import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_s> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f64_s); }
    public static readonly instance = new I64TruncateF64SignedInstruction();
}
I64TruncateF64SignedInstruction.registerInstruction(OpCodes.i64_trunc_f64_s);