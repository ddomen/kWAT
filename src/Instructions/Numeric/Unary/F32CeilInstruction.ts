import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32CeilInstruction extends AbstractNumericInstruction<OpCodes.f32_ceil> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_ceil); }
    public static readonly instance = new F32CeilInstruction();
}
F32CeilInstruction.registerInstruction(OpCodes.f32_ceil);