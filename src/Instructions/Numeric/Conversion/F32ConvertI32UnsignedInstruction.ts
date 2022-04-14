import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i32_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i32_u); }
    public static readonly instance = new F32ConvertI32UnsignedInstruction();
}
F32ConvertI32UnsignedInstruction.registerInstruction(OpCodes.f32_convert_i32_u);