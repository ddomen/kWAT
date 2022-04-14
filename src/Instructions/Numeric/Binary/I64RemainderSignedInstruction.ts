import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64RemainderSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_rem_s> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rem_s); }
    public static readonly instance = new I64RemainderSignedInstruction();
}
I64RemainderSignedInstruction.registerInstruction(OpCodes.i64_rem_s);