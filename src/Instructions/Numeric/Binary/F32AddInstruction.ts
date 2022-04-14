import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32AddInstruction extends AbstractNumericInstruction<OpCodes.f32_add> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_add); }
    public static readonly instance = new F32AddInstruction();
}
F32AddInstruction.registerInstruction(OpCodes.f32_add);