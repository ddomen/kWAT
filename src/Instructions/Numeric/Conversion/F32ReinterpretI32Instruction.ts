import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32ReinterpretI32Instruction extends AbstractNumericInstruction<OpCodes.f32_reinterpret_i32> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_reinterpret_i32); }
    public static readonly instance = new F32ReinterpretI32Instruction();
}
F32ReinterpretI32Instruction.registerInstruction(OpCodes.f32_reinterpret_i32);