import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64GreaterEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_ge_s> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ge_s); }
    public static readonly instance = new I64GreaterEqualSignedInstruction();
}
I64GreaterEqualSignedInstruction.registerInstruction(OpCodes.i64_ge_s);