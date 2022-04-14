import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32ReinterpretF32Instruction extends AbstractNumericInstruction<OpCodes.i32_reinterpret_f32> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_reinterpret_f32); }
    public static readonly instance = new I32ReinterpretF32Instruction();
}
I32ReinterpretF32Instruction.registerInstruction(OpCodes.i32_reinterpret_f32);