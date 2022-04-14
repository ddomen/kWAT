import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_div_u> {
    private constructor() { super(OpCodes.i32_div_u); }
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    public static readonly instance = new I32DivideUnsignedInstruction();
}
I32DivideUnsignedInstruction.registerInstruction(OpCodes.i32_div_u);