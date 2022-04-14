import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_div_u> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_div_u); }
    public static readonly instance = new I64DivideUnsignedInstruction();
}
I64DivideUnsignedInstruction.registerInstruction(OpCodes.i64_div_u);