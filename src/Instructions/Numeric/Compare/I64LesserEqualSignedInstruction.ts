import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_s> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_le_s); }
    public static readonly instance = new I64LesserEqualSignedInstruction();
}
I64LesserEqualSignedInstruction.registerInstruction(OpCodes.i64_le_s);