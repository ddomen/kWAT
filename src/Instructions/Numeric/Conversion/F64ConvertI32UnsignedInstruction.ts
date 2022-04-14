import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i32_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i32_u); }
    public static readonly instance = new F64ConvertI32UnsignedInstruction();
}
F64ConvertI32UnsignedInstruction.registerInstruction(OpCodes.f64_convert_i32_u);