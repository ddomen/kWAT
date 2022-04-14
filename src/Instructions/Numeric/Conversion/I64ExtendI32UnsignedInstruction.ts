import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64ExtendI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend_i32_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend_i32_u); }
    public static readonly instance = new I64ExtendI32UnsignedInstruction();
}
I64ExtendI32UnsignedInstruction.registerInstruction(OpCodes.i64_extend_i32_u);