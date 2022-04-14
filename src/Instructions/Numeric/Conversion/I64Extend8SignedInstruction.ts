import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend8_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend8_s); }
    public static readonly instance = new I64Extend8SignedInstruction();
}
I64Extend8SignedInstruction.registerInstruction(OpCodes.i64_extend8_s);