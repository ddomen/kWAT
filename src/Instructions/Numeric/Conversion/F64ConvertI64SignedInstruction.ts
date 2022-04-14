import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i64_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i64_s); }
    public static readonly instance = new F64ConvertI64SignedInstruction();
}
F64ConvertI64SignedInstruction.registerInstruction(OpCodes.f64_convert_i64_s);