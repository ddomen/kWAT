import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_s> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f64_s); }
    public static readonly instance = new I32TruncateF64SignedInstruction();
}
I32TruncateF64SignedInstruction.registerInstruction(OpCodes.i32_trunc_f64_s);