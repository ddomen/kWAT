import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_shl> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_shl); }
    public static readonly instance = new I64BitShifLeftInstruction();
}
I64BitShifLeftInstruction.registerInstruction(OpCodes.i64_shl);