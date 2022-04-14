import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64LesserEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_u> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_le_u); }
    public static readonly instance = new I64LesserEqualUnsignedInstruction();
}
I64LesserEqualUnsignedInstruction.registerInstruction(OpCodes.i64_le_u);