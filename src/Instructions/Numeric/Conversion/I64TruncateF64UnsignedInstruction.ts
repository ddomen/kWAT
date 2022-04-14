import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_u> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f64_u); }
    public static readonly instance = new I64TruncateF64UnsignedInstruction();
}
I64TruncateF64UnsignedInstruction.registerInstruction(OpCodes.i64_trunc_f64_u);