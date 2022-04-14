import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Extend32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend32_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend32_s); }
    public static readonly instance = new I64Extend32SignedInstruction();
}
I64Extend32SignedInstruction.registerInstruction(OpCodes.i64_extend32_s);