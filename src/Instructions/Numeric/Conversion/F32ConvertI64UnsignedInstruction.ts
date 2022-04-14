import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32ConvertI64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_u> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i64_u); }
    public static readonly instance = new F32ConvertI64UnsignedInstruction();
}
F32ConvertI64UnsignedInstruction.registerInstruction(OpCodes.f32_convert_i64_u);