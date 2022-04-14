import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32SubtractInstruction extends AbstractNumericInstruction<OpCodes.f32_sub> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_sub); }
    public static readonly instance = new F32SubtractInstruction();
}
F32SubtractInstruction.registerInstruction(OpCodes.f32_sub);