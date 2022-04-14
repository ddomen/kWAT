import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64GreaterSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_gt_s> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_gt_s); }
    public static readonly instance = new I64GreaterSignedInstruction();
}
I64GreaterSignedInstruction.registerInstruction(OpCodes.i64_gt_s);