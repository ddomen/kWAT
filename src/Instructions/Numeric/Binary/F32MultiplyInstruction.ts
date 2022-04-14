import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f32_mul> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_mul); }
    public static readonly instance = new F32MultiplyInstruction();
}
F32MultiplyInstruction.registerInstruction(OpCodes.f32_mul);