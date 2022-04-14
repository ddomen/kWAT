import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_s> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f32_s); }
    public static readonly instance = new I32TruncateF32SignedInstruction();
}
I32TruncateF32SignedInstruction.registerInstruction(OpCodes.i32_trunc_f32_s);