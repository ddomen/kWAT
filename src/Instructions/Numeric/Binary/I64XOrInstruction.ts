import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64XOrInstruction extends AbstractNumericInstruction<OpCodes.i64_xor> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_xor); }
    public static readonly instance = new I64XOrInstruction();
}
I64XOrInstruction.registerInstruction(OpCodes.i64_xor);