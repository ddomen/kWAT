import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i64_s); }
    public static readonly instance = new F32ConvertI64SignedInstruction();
}
F32ConvertI64SignedInstruction.registerInstruction(OpCodes.f32_convert_i64_s);