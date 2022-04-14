import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32LesserUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_u> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_lt_u); }
    public static readonly instance = new I32LesserUnsignedInstruction();
}
I32LesserUnsignedInstruction.registerInstruction(OpCodes.i32_lt_u);