import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32MaxInstruction extends AbstractNumericInstruction<OpCodes.f32_max> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_max); }
    public static readonly instance = new F32MaxInstruction();
}
F32MaxInstruction.registerInstruction(OpCodes.f32_max);