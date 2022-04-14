import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64OrInstruction extends AbstractNumericInstruction<OpCodes.i64_or> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_or); }
    public static readonly instance = new I64OrInstruction();
}
I64OrInstruction.registerInstruction(OpCodes.i64_or);