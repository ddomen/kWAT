import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f32_s> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f32_s); }
    public static readonly instance = new I64TruncateF32SignedInstruction();
}
I64TruncateF32SignedInstruction.registerInstruction(OpCodes.i64_trunc_f32_s);