import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32GreaterInstruction extends AbstractNumericInstruction<OpCodes.f32_gt> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_gt); }
    public static readonly instance = new F32GreaterInstruction();
}
F32GreaterInstruction.registerInstruction(OpCodes.f32_gt);