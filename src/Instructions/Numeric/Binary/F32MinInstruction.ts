import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32MinInstruction extends AbstractNumericInstruction<OpCodes.f32_min> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_min); }
    public static readonly instance = new F32MinInstruction();
}
F32MinInstruction.registerInstruction(OpCodes.f32_min);