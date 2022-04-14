import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32TruncateF32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_u> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f32_u); }
    public static readonly instance = new I32TruncateF32UnsignedInstruction();
}
I32TruncateF32UnsignedInstruction.registerInstruction(OpCodes.i32_trunc_f32_u);