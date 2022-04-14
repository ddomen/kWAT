import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_u> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f64_u); }
    public static readonly instance = new I32TruncateF64UnsignedInstruction();
}
I32TruncateF64UnsignedInstruction.registerInstruction(OpCodes.i32_trunc_f64_u);