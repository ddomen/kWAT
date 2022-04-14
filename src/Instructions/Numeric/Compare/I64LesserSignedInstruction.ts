import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_lt_s> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_lt_s); }
    public static readonly instance = new I64LesserSignedInstruction();
}
I64LesserSignedInstruction.registerInstruction(OpCodes.i64_lt_s);