import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32CopySignInstruction extends AbstractNumericInstruction<OpCodes.f32_copysign> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_copysign); }
    public static readonly instance = new F32CopySignInstruction();
}
F32CopySignInstruction.registerInstruction(OpCodes.f32_copysign);