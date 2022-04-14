import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32LesserInstruction extends AbstractNumericInstruction<OpCodes.f32_lt> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_lt); }
    public static readonly instance = new F32LesserInstruction();
}
F32LesserInstruction.registerInstruction(OpCodes.f32_lt);