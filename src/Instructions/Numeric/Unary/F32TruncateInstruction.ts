import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32TruncateInstruction extends AbstractNumericInstruction<OpCodes.f32_trunc> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_trunc); }
    public static readonly instance = new F32TruncateInstruction();
}
F32TruncateInstruction.registerInstruction(OpCodes.f32_trunc);