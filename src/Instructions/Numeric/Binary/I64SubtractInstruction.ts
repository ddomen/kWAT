import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64SubtractInstruction extends AbstractNumericInstruction<OpCodes.i64_sub> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_sub); }
    public static readonly instance = new I64SubtractInstruction();
}
I64SubtractInstruction.registerInstruction(OpCodes.i64_sub);